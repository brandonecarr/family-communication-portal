"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, Mail, Globe, Shield, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("en");
  const [originalName, setOriginalName] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalLanguage, setOriginalLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize Supabase client only on the client side
  useEffect(() => {
    setSupabase(createClient());
  }, []);

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
    setPhone(formatted);
  };

  useEffect(() => {
    if (!supabase) return;
    
    const fetchProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/sign-in");
        return;
      }

      setUser(user);

      // Fetch from users table for name and role (phone column may not exist)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("full_name, name, role")
        .eq("id", user.id)
        .single();

      if (usersError) {
        console.log("Users table query error (may be RLS):", usersError.message);
      }
      
      setUserData(usersData);

      // Fetch from family_members table for additional profile data (only for family members)
      const { data: profileData, error: profileError } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle() to avoid error when no rows found

      if (profileError && profileError.code !== 'PGRST116') {
        console.log("Family members query error:", profileError.message);
      }
      
      setProfile(profileData);
      
      // Set name from users table (full_name or name) or family_members table or user metadata
      const displayName = usersData?.full_name || usersData?.name || profileData?.name || user.user_metadata?.full_name || "";
      setName(displayName);
      setOriginalName(displayName);
      
      // Set phone from family_members table or user metadata
      const displayPhone = profileData?.phone || user.user_metadata?.phone || "";
      setPhone(displayPhone);
      setOriginalPhone(displayPhone);
      
      // Set language
      const displayLanguage = profileData?.preferred_language || "en";
      setLanguage(displayLanguage);
      setOriginalLanguage(displayLanguage);
      
      console.log("Profile data loaded:", { usersData, profileData, displayName, displayPhone, userMetadata: user.user_metadata });
    };

    fetchProfile();
  }, [supabase, router]);

  const hasChanges = name !== originalName || phone !== originalPhone || language !== originalLanguage;

  const handleSave = async () => {
    if (!supabase || !user) return;
    
    setSaving(true);
    try {
      // Update users table
      const { error: usersError } = await supabase
        .from("users")
        .update({ 
          full_name: name,
          name: name,
        })
        .eq("id", user.id);

      if (usersError) {
        console.error("Error updating users table:", usersError);
      }

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          full_name: name,
          phone: phone,
        }
      });

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
        throw metadataError;
      }

      // If user has a family_members record, update it too
      if (profile) {
        const { error: profileError } = await supabase
          .from("family_members")
          .update({ 
            name: name,
            phone: phone,
            preferred_language: language,
          })
          .eq("user_id", user.id);

        if (profileError) {
          console.error("Error updating family_members:", profileError);
        }
      }

      // Update original values
      setOriginalName(name);
      setOriginalPhone(phone);
      setOriginalLanguage(language);

      toast({
        title: "Profile updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message || "An error occurred while saving your profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(originalName);
    setPhone(originalPhone);
    setLanguage(originalLanguage);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back to Dashboard Button */}
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-[#2D2D2D] hover:text-[#7A9B8E] hover:bg-transparent"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Profile Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account information and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#7A9B8E]/10 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-[#7A9B8E]" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                    Account Information
                  </CardTitle>
                  <CardDescription>Your basic account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Preferences */}
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#B8A9D4]/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-[#B8A9D4]" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                    Language & Preferences
                  </CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
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
                  All content will be displayed in your preferred language
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role & Access */}
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#D4876F]/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-[#D4876F]" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
                    Role & Access
                  </CardTitle>
                  <CardDescription>Your permissions and access level</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Role</Label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-[#7A9B8E]/10 text-[#7A9B8E] text-sm font-medium">
                    {(userData?.role || user?.user_metadata?.role || 'family_member').replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              {profile?.relationship && (
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile.relationship}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              size="lg"
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full px-8"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="rounded-full px-8"
              onClick={handleCancel}
              disabled={saving || !hasChanges}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
