"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Lock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  UserPlus,
  Trash2,
  Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StaffMember {
  name: string;
  email: string;
  role: string;
  job_role?: string;
}

export default function FacilitySetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const facilityId = searchParams.get("facility");
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [facility, setFacility] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    facilityName: "",
    facilityPhone: "",
    facilityAddress: "",
    facilityCity: "",
    facilityState: "",
    facilityZip: "",
    facilityDescription: "",
  });
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "agency_staff", job_role: "" });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        // User not logged in, redirect to sign-in
        router.push("/sign-in");
        return;
      }

      // Load facility data if facilityId is provided
      if (facilityId) {
        const { data: facilityData } = await supabase
          .from("agencies")
          .select("*")
          .eq("id", facilityId)
          .single();
        
        if (facilityData) {
          setFacility(facilityData);
          setFormData(prev => ({
            ...prev,
            facilityName: facilityData.name || "",
            facilityPhone: facilityData.phone || "",
            facilityAddress: facilityData.address || "",
            facilityCity: facilityData.city || "",
            facilityState: facilityData.state || "",
            facilityZip: facilityData.zip_code || "",
          }));
        }
      }

      // Check if user needs password setup based on metadata
      if (currentUser?.user_metadata?.needs_password_setup) {
        setStep(1);
      } else {
        setStep(2);
      }
      
      setInitialLoading(false);
    };

    loadData();
  }, [facilityId, router]);

  const handlePasswordSetup = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          needs_password_setup: false,
        },
      });

      if (updateError) throw updateError;

      // Update user record
      if (user) {
        await supabase
          .from("users")
          .update({ needs_password_setup: false })
          .eq("id", user.id);
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacilitySetup = async () => {
    if (!formData.facilityName) {
      setError("Facility name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("agencies")
        .update({
          name: formData.facilityName,
          phone: formData.facilityPhone,
          address: formData.facilityAddress,
          city: formData.facilityCity,
          state: formData.facilityState,
          zip_code: formData.facilityZip,
        })
        .eq("id", facilityId);

      if (updateError) throw updateError;

      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addStaffMember = () => {
    if (!newStaff.name || !newStaff.email) {
      setError("Staff name and email are required");
      return;
    }
    setStaffMembers([...staffMembers, newStaff]);
    setNewStaff({ name: "", email: "", role: "agency_staff", job_role: "" });
    setError("");
  };

  const removeStaffMember = (index: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== index));
  };

  const handleStaffInvites = async () => {
    setLoading(true);
    setError("");

    try {
      // Send invites to all staff members
      for (const staff of staffMembers) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: staff.email,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/setup?facility=${facilityId}`,
            data: {
              full_name: staff.name,
              role: staff.role,
              agency_id: facilityId,
              needs_password_setup: true,
            },
          },
        });

        if (otpError) {
          console.error(`Error inviting ${staff.email}:`, otpError);
        }
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      // Mark facility onboarding as complete
      await supabase
        .from("agencies")
        .update({ 
          onboarding_completed: true,
          admin_user_id: user?.id,
        })
        .eq("id", facilityId);

      // Mark user onboarding as complete
      if (user) {
        await supabase
          .from("users")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }

      // Mark invite as accepted
      if (token) {
        await supabase
          .from("facility_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("token", token);
      }

      // Assign user to agency
      if (user && facilityId) {
        await supabase
          .from("agency_users")
          .upsert({
            user_id: user.id,
            agency_id: facilityId,
            role: "agency_admin",
          });
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    "Set Up Your Password",
    "Configure Your Facility",
    "Invite Your Team",
    "You're All Set!",
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7A9B8E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </p>
            <p className="text-sm font-medium text-[#2D2D2D]">
              {stepTitles[step - 1]}
            </p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Password Setup */}
        {step === 1 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-[#7A9B8E]" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'Fraunces, serif' }}>
                Create Your Password
              </CardTitle>
              <CardDescription>
                Set a secure password for your administrator account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
              <Button
                onClick={handlePasswordSetup}
                disabled={loading}
                className="w-full bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              >
                {loading ? "Setting up..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Facility Setup */}
        {step === 2 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-[#7A9B8E]" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'Fraunces, serif' }}>
                Configure Your Facility
              </CardTitle>
              <CardDescription>
                Review and update your facility information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="facilityName">Facility Name *</Label>
                <Input
                  id="facilityName"
                  placeholder="Sunrise Hospice Care"
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityPhone">Phone</Label>
                <Input
                  id="facilityPhone"
                  placeholder="(555) 123-4567"
                  value={formData.facilityPhone}
                  onChange={(e) => setFormData({ ...formData, facilityPhone: e.target.value })}
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityAddress">Address</Label>
                <Input
                  id="facilityAddress"
                  placeholder="123 Healthcare Blvd"
                  value={formData.facilityAddress}
                  onChange={(e) => setFormData({ ...formData, facilityAddress: e.target.value })}
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facilityCity">City</Label>
                  <Input
                    id="facilityCity"
                    placeholder="Springfield"
                    value={formData.facilityCity}
                    onChange={(e) => setFormData({ ...formData, facilityCity: e.target.value })}
                    className="bg-[#FAF8F5] border-[#E8E4DF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilityState">State</Label>
                  <Input
                    id="facilityState"
                    placeholder="CA"
                    value={formData.facilityState}
                    onChange={(e) => setFormData({ ...formData, facilityState: e.target.value })}
                    className="bg-[#FAF8F5] border-[#E8E4DF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilityZip">ZIP</Label>
                  <Input
                    id="facilityZip"
                    placeholder="90210"
                    value={formData.facilityZip}
                    onChange={(e) => setFormData({ ...formData, facilityZip: e.target.value })}
                    className="bg-[#FAF8F5] border-[#E8E4DF]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {user?.user_metadata?.needs_password_setup && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleFacilitySetup}
                  disabled={loading}
                  className={`${user?.user_metadata?.needs_password_setup ? 'flex-1' : 'w-full'} bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white`}
                >
                  {loading ? "Saving..." : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Invite Team */}
        {step === 3 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#B8A9D4]/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-[#B8A9D4]" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'Fraunces, serif' }}>
                Invite Your Team
              </CardTitle>
              <CardDescription>
                Add staff members who will help manage your facility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              {/* Add Staff Form */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="bg-white"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="bg-white"
                  />
                  <Select
                    value={newStaff.job_role}
                    onValueChange={(value) => setNewStaff({ ...newStaff, job_role: value })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select job role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="social_worker">Social Worker</SelectItem>
                      <SelectItem value="chaplain">Chaplain</SelectItem>
                      <SelectItem value="aide">Aide</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={addStaffMember}
                    variant="outline"
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Staff List */}
              {staffMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Team Members to Invite</Label>
                  <div className="space-y-2">
                    {staffMembers.map((staff, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E8E4DF]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#B8A9D4]/20 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-[#B8A9D4]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{staff.name}</p>
                            <p className="text-xs text-muted-foreground">{staff.email}</p>
                            {staff.job_role && (
                              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                {staff.job_role.replace('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                            Staff
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStaffMember(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staffMembers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No team members added yet</p>
                  <p className="text-xs">You can always add team members later</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={staffMembers.length > 0 ? handleStaffInvites : () => setStep(4)}
                  disabled={loading}
                  className="flex-1 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
                >
                  {loading ? "Sending invites..." : staffMembers.length > 0 ? "Send Invites" : "Skip for Now"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'Fraunces, serif' }}>
                You're All Set!
              </CardTitle>
              <CardDescription>
                Your facility is ready to use. You can now start managing patients and families.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-[#FAF8F5] space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Password configured</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Facility information updated</span>
                </div>
                {staffMembers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm">{staffMembers.length} team member(s) invited</span>
                  </div>
                )}
              </div>

              <Button
                onClick={completeOnboarding}
                disabled={loading}
                className="w-full bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              >
                {loading ? "Finishing..." : "Go to Dashboard"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
