"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  User,
  Lock,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  agency_id: string;
  invited_by_name: string;
  status: string;
  expires_at: string;
  agency?: {
    name: string;
  };
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const authCode = searchParams.get("code"); // OTP code from generateLink
  const facilityId = searchParams.get("facility");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authVerified, setAuthVerified] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  // Handle OTP verification for generateLink flow
  useEffect(() => {
    async function verifyAuthCode() {
      if (!authCode) {
        setAuthVerified(true);
        return;
      }

      try {
        // Try invite type first, then magiclink
        let result = await supabase.auth.verifyOtp({
          token_hash: authCode,
          type: "invite",
        });

        if (result.error) {
          result = await supabase.auth.verifyOtp({
            token_hash: authCode,
            type: "magiclink",
          });
        }

        if (result.error) {
          console.error("Error verifying OTP:", result.error);
          setError("Invalid or expired invitation link. Please request a new invitation.");
          setLoading(false);
          return;
        }

        // Wait for session to be established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the user from the session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setAuthUser(user);
          // Pre-fill form with user metadata
          setFormData(prev => ({
            ...prev,
            fullName: user.user_metadata?.full_name || "",
          }));
          
          // Create a synthetic invitation object from user metadata
          const agencyId = user.user_metadata?.agency_id || facilityId;
          
          // Get agency name
          const { data: agency } = await supabase
            .from("agencies")
            .select("name")
            .eq("id", agencyId)
            .single();
          
          setInvitation({
            id: "auth-flow",
            email: user.email || email || "",
            role: user.user_metadata?.role || "agency_staff",
            agency_id: agencyId,
            invited_by_name: "Administrator",
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            agency: agency ? { name: agency.name } : undefined,
          });
        }

        setAuthVerified(true);
        setLoading(false);
      } catch (err) {
        console.error("Error in auth verification:", err);
        setError("An error occurred while verifying your invitation.");
        setLoading(false);
      }
    }

    verifyAuthCode();
  }, [authCode, facilityId, email, supabase]);

  // Validate invitation on mount (for token-based flow)
  useEffect(() => {
    async function validateInvitation() {
      // Skip if using auth code flow
      if (authCode) return;
      
      if (!token || !email) {
        setError("Invalid invitation link. Please check your email for the correct link.");
        setLoading(false);
        return;
      }

      try {
        const { data: inviteData, error: inviteError } = await supabase
          .from("team_invitations")
          .select(`
            *,
            agency:agencies(name)
          `)
          .eq("token", token)
          .eq("email", decodeURIComponent(email))
          .single();

        if (inviteError || !inviteData) {
          setError("Invitation not found. It may have been cancelled or already used.");
          setLoading(false);
          return;
        }

        if (inviteData.status !== "pending") {
          setError("This invitation has already been accepted or cancelled.");
          setLoading(false);
          return;
        }

        const expiresAt = new Date(inviteData.expires_at);
        if (expiresAt < new Date()) {
          setError("This invitation has expired. Please ask your administrator to send a new one.");
          setLoading(false);
          return;
        }

        setInvitation(inviteData);
        setLoading(false);
      } catch (err) {
        console.error("Error validating invitation:", err);
        setError("An error occurred while validating your invitation.");
        setLoading(false);
      }
    }

    validateInvitation();
  }, [token, email, authCode, supabase]);

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName.trim()) {
        toast({
          title: "Required",
          description: "Please enter your full name",
          variant: "destructive",
        });
        return;
      }
    }

    if (step === 2) {
      if (formData.password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match",
          variant: "destructive",
        });
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!invitation) return;

    setSubmitting(true);

    try {
      let userId: string;

      // Check if user is already authenticated (auth code flow)
      if (authUser) {
        userId = authUser.id;
        
        // Update the user's password
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.password,
          data: {
            full_name: formData.fullName,
            needs_password_setup: false,
          },
        });

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        // Token-based flow: Create the user account
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: invitation.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              agency_id: invitation.agency_id,
              role: invitation.role,
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (!authData.user) {
          throw new Error("Failed to create account");
        }

        userId = authData.user.id;
      }

      // 2. Update the invitation status (only for token-based flow)
      if (invitation.id !== "auth-flow") {
        await supabase
          .from("team_invitations")
          .update({ status: "accepted" })
          .eq("id", invitation.id);
      }

      // 3. Create/update user record
      await supabase.from("users").upsert({
        id: userId,
        email: invitation.email,
        full_name: formData.fullName,
        phone: formData.phone || null,
        role: invitation.role,
        agency_id: invitation.agency_id,
        onboarding_completed: true,
      });

      // 4. Add to agency_users (upsert to handle existing records from invite flow)
      await supabase.from("agency_users").upsert({
        user_id: userId,
        agency_id: invitation.agency_id,
        role: invitation.role,
      }, { onConflict: 'user_id,agency_id' });

      toast({
        title: authUser ? "Account setup complete!" : "Account created!",
        description: "Welcome to the team. Redirecting to your dashboard...",
      });

      // Redirect based on role
      setTimeout(() => {
        if (invitation.role === "agency_admin") {
          router.push("/admin");
        } else {
          router.push("/admin");
        }
      }, 1500);
    } catch (err: any) {
      console.error("Error creating account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const roleLabel = invitation?.role === "agency_admin" ? "Administrator" : "Staff Member";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <Card className="w-full max-w-md soft-shadow border-0">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#7A9B8E]" />
            <p className="mt-4 text-[#2D2D2D]">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <Card className="w-full max-w-md soft-shadow border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#2D2D2D] mb-2">
              Invalid Invitation
            </h2>
            <p className="text-[#666666] mb-6">{error}</p>
            <Button
              onClick={() => router.push("/sign-in")}
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg soft-shadow border-0">
        <CardHeader className="bg-gradient-to-r from-[#7A9B8E] to-[#5a7b6e] text-white rounded-t-lg">
          <CardTitle className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Welcome to the Team!</h1>
            <p className="text-white/80 text-sm font-normal">
              You've been invited to join{" "}
              <span className="font-medium">{invitation?.agency?.name}</span> as a{" "}
              <span className="font-medium">{roleLabel}</span>
            </p>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-[#666666] mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#7A9B8E]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2D2D2D]">
                    Personal Information
                  </h2>
                  <p className="text-sm text-[#666666]">
                    Tell us a bit about yourself
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="Enter your full name"
                    className="border-[#E5E5E5]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={invitation?.email || ""}
                    disabled
                    className="bg-[#FAF8F5] border-[#E5E5E5]"
                  />
                  <p className="text-xs text-[#999999]">
                    This is the email your invitation was sent to
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="border-[#E5E5E5]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Create Password */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-[#7A9B8E]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2D2D2D]">
                    Create Password
                  </h2>
                  <p className="text-sm text-[#666666]">
                    Secure your account with a strong password
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a password"
                    className="border-[#E5E5E5]"
                  />
                  <p className="text-xs text-[#999999]">
                    Must be at least 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm your password"
                    className="border-[#E5E5E5]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[#7A9B8E]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2D2D2D]">
                    Confirm & Join
                  </h2>
                  <p className="text-sm text-[#666666]">
                    Review your information and join the team
                  </p>
                </div>
              </div>

              <div className="bg-[#FAF8F5] rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#666666]">Name</span>
                  <span className="font-medium text-[#2D2D2D]">
                    {formData.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Email</span>
                  <span className="font-medium text-[#2D2D2D]">
                    {invitation?.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Organization</span>
                  <span className="font-medium text-[#2D2D2D]">
                    {invitation?.agency?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">Role</span>
                  <span className="font-medium text-[#2D2D2D]">{roleLabel}</span>
                </div>
                {formData.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Phone</span>
                    <span className="font-medium text-[#2D2D2D]">
                      {formData.phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#7A9B8E]/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-[#7A9B8E] mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-[#2D2D2D]">
                    You're almost there!
                  </p>
                  <p className="text-[#666666]">
                    Click "Complete Setup" to create your account and start
                    collaborating with your team.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : step === totalSteps ? (
                "Complete Setup"
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {/* Invited by */}
          <p className="text-center text-xs text-[#999999] mt-6">
            Invited by {invitation?.invited_by_name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A9B8E]" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
