"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Mail, UserPlus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../../../supabase/client";

export default function InviteMemberPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentMemberData, setCurrentMemberData] = useState<{ patient_id: string; role: string } | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    relationship: "",
    role: "family_member",
  });

  // Format phone number as (xxx) xxx-xxxx
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        const { data: currentMember } = await supabase
          .from("family_members")
          .select("patient_id, role")
          .eq("user_id", user.id)
          .single();

        if (currentMember && currentMember.role === "family_admin") {
          setHasPermission(true);
          setCurrentMemberData(currentMember);
        }
      } catch (error) {
        console.error("Error checking permission:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/sign-in");
        return;
      }

      if (!currentMemberData) {
        toast({
          title: "Permission denied",
          description: "Only family administrators can invite members",
          variant: "destructive",
        });
        return;
      }

      // Create invitation
      const { error } = await supabase.from("family_invitations").insert({
        patient_id: currentMemberData.patient_id,
        invited_by: user.id,
        email: formData.email,
        name: formData.name,
        phone: formData.phone || null,
        relationship: formData.relationship,
        role: formData.role,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${formData.email}`,
      });

      router.push("/family/members");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardContent className="p-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto" />
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link href="/family/members">
            <Button variant="ghost" className="mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Family Access
            </Button>
          </Link>

          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#D4876F]/10 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-[#D4876F]" />
              </div>
              <h2 className="text-2xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                Permission Required
              </h2>
              <p className="text-muted-foreground mb-6">
                Only family administrators can invite new members. Please contact your family administrator if you need to add someone.
              </p>
              <Link href="/family/members">
                <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white">
                  Back to Family Access
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/family/members">
          <Button variant="ghost" className="mb-6 -ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Family Access
          </Button>
        </Link>

        <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-[#7A9B8E]" />
            </div>
            <CardTitle className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Invite Family Member
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Send an invitation to give someone access to care information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="family@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  They'll receive an invitation link at this email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="h-12"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">
                  Relationship to Patient <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  required
                >
                  <SelectTrigger id="relationship" className="h-12">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse/Partner</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Access Level</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="role" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family_member">
                      <div>
                        <div className="font-medium">Family Member</div>
                        <div className="text-xs text-muted-foreground">
                          Can view information and communicate with care team
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="family_admin">
                      <div>
                        <div className="font-medium">Administrator</div>
                        <div className="text-xs text-muted-foreground">
                          Can manage family access and all permissions
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-[#7A9B8E]/5 rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2">What they'll be able to do:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• View visit schedules and care team information</li>
                  <li>• Send secure messages to the care team</li>
                  <li>• Track deliveries and request supplies</li>
                  <li>• Access educational resources</li>
                  {formData.role === "family_admin" && (
                    <li className="text-[#7A9B8E] font-medium">• Invite and manage other family members</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 h-12 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.email || !formData.name || !formData.relationship}
                  className="flex-1 h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full"
                >
                  {submitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
