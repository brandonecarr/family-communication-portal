"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Globe, User, Heart } from "lucide-react";
import { createClient } from "../../../supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    language: "en",
    relationship: "",
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, "");
    
    // Format as (xxx) xxx-xxxx
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

  const saveOnboardingData = async () => {
    if (!supabase) return;
    
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/sign-in");
        return;
      }

      // Update users table with full_name and phone
      await supabase
        .from("users")
        .update({ 
          full_name: formData.name,
          name: formData.name,
          phone: formData.phone,
          onboarding_completed: true 
        })
        .eq("id", user.id);

      // Update family_members table with name, phone, relationship, and language
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (familyMember) {
        await supabase
          .from("family_members")
          .update({
            name: formData.name,
            phone: formData.phone,
            relationship: formData.relationship,
            preferred_language: formData.language,
          })
          .eq("user_id", user.id);
      }

      router.push("/family");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding - save data to database
      await saveOnboardingData();
    }
  };

  const handleSkip = async () => {
    // Still save any data that was entered
    if (formData.name || formData.phone) {
      await saveOnboardingData();
    } else {
      router.push("/family");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </p>
            <Button variant="ghost" onClick={handleSkip} className="text-sm">
              Skip for now
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                <User className="h-8 w-8 text-[#7A9B8E]" />
              </div>
              <CardTitle className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Welcome to the Family Portal
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Let's get to know you better so we can personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="h-12"
                  maxLength={14}
                />
                <p className="text-sm text-muted-foreground">
                  We'll use this to send you important updates
                </p>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full text-base"
                disabled={!formData.name || !formData.phone}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Language Preference */}
        {step === 2 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#B8A9D4]/10 flex items-center justify-center">
                <Globe className="h-8 w-8 text-[#B8A9D4]" />
              </div>
              <CardTitle className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Choose Your Language
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Select your preferred language for all communications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger id="language" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  You can change this later in your profile settings
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-12 rounded-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Relationship */}
        {step === 3 && (
          <Card className="border-none shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#D4876F]/10 flex items-center justify-center">
                <Heart className="h-8 w-8 text-[#D4876F]" />
              </div>
              <CardTitle className="text-3xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                Your Relationship
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Help us understand your connection to the patient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship to Patient</Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData({ ...formData, relationship: value })}
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

              <div className="bg-[#7A9B8E]/5 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-sm">What's next?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7A9B8E] mt-0.5 flex-shrink-0" />
                    <span>View upcoming visits and care team information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7A9B8E] mt-0.5 flex-shrink-0" />
                    <span>Send secure messages to your care team</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#7A9B8E] mt-0.5 flex-shrink-0" />
                    <span>Access educational resources and care plans</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-12 rounded-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full"
                  disabled={!formData.relationship || saving}
                >
                  {saving ? "Saving..." : "Get Started"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
