"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/../supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

interface StaffMember {
  name: string;
  email: string;
  role: string;
}

function AdminSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const facilityId = searchParams.get("facility");
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [facility, setFacility] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    facilityName: "",
    facilityPhone: "",
    facilityAddress: "",
    facilityCity: "",
    facilityState: "",
    facilityZip: "",
  });
  
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "agency_staff" });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push("/sign-in");
        return;
      }
      
      setUser(currentUser);

      const needsPassword = currentUser.user_metadata?.needs_password_setup === true;
      setNeedsPasswordSetup(needsPassword);

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

      if (needsPassword) {
        setStep(1);
      } else {
        setStep(2);
      }
      
      setLoading(false);
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

    setSubmitting(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          needs_password_setup: false,
        },
      });

      if (updateError) throw updateError;

      if (user) {
        await supabase
          .from("users")
          .update({ needs_password_setup: false })
          .eq("id", user.id);
      }

      setNeedsPasswordSetup(false);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFacilitySetup = async () => {
    if (!formData.facilityName) {
      setError("Facility name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (facilityId) {
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
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addStaffMember = () => {
    if (!newStaff.name || !newStaff.email) {
      setError("Staff name and email are required");
      return;
    }
    setStaffMembers([...staffMembers, newStaff]);
    setNewStaff({ name: "", email: "", role: "agency_staff" });
    setError("");
  };

  const removeStaffMember = (index: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== index));
  };

  const handleStaffInvites = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Import the server action
      const { inviteStaffMembers } = await import("@/lib/actions/facilities");
      
      // Call the server action to invite staff members
      const { results } = await inviteStaffMembers(staffMembers, facilityId!);
      
      // Check if any invitations failed
      const failures = results?.filter((r: any) => !r.success) || [];
      if (failures.length > 0) {
        console.error("Some invitations failed:", failures);
        setError(`Failed to invite ${failures.length} staff member(s). Check console for details.`);
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    setSubmitting(true);

    try {
      if (facilityId) {
        await supabase
          .from("agencies")
          .update({ 
            onboarding_completed: true,
            admin_user_id: user?.id,
          })
          .eq("id", facilityId);
      }

      if (user) {
        await supabase
          .from("users")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }

      if (token) {
        await supabase
          .from("facility_invites")
          .update({ accepted_at: new Date().toISOString() })
          .eq("token", token);
      }

      if (user && facilityId) {
        const { data: existingAssignment } = await supabase
          .from("agency_users")
          .select("id")
          .eq("user_id", user.id)
          .eq("agency_id", facilityId)
          .single();

        if (!existingAssignment) {
          await supabase
            .from("agency_users")
            .insert({
              user_id: user.id,
              agency_id: facilityId,
              role: "agency_admin",
            });
        }
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [
    "Set Up Your Password",
    "Configure Your Facility",
    "Invite Your Team",
    "You're All Set!",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#7A9B8E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
                disabled={submitting}
                className="w-full bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              >
                {submitting ? "Setting up..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

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
                {needsPasswordSetup && (
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
                  disabled={submitting}
                  className={`${needsPasswordSetup ? 'flex-1' : 'w-full'} bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white`}
                >
                  {submitting ? "Saving..." : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  disabled={submitting}
                  className="flex-1 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
                >
                  {submitting ? "Sending invites..." : staffMembers.length > 0 ? "Send Invites" : "Skip for Now"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                disabled={submitting}
                className="w-full bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              >
                {submitting ? "Finishing..." : "Go to Dashboard"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AdminSetupContent />
    </Suspense>
  );
}
