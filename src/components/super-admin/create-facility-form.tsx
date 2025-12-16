"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, X, Users } from "lucide-react";
import Link from "next/link";
import { createFacility } from "@/lib/actions/facilities";
import { useToast } from "@/components/ui/use-toast";

export function CreateFacilityForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  function formatPhoneNumber(value: string) {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, "");
    
    // Format as (xxx) xxx-xxxx
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneValue(formatted);
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    
    try {
      const result = await createFacility(formData);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Facility created successfully! An invitation email has been sent to the admin.",
        });
        router.push("/super-admin/facilities");
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create facility",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="soft-shadow border-0 bg-white mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle style={{ fontFamily: 'Fraunces, serif' }}>
          Create New Facility
        </CardTitle>
        <Link href="/super-admin/facilities">
          <Button variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {/* Admin Account Section */}
          <div className="p-4 rounded-xl bg-[#7A9B8E]/10 border border-[#7A9B8E]/20">
            <h3 className="font-semibold text-[#2D2D2D] mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7A9B8E]" />
              Facility Administrator
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This person will receive an email to set up their account and complete facility onboarding.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Admin Name *</Label>
                <Input 
                  id="admin_name" 
                  name="admin_name" 
                  placeholder="John Smith" 
                  required 
                  className="bg-white border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email *</Label>
                <Input 
                  id="admin_email" 
                  name="admin_email" 
                  type="email"
                  placeholder="admin@facility.com" 
                  required 
                  className="bg-white border-[#E8E4DF]"
                />
              </div>
            </div>
          </div>

          {/* Facility Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Facility Name *</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Sunrise Hospice Care" 
                required 
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Facility Contact Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email"
                placeholder="contact@facility.com" 
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
              <p className="text-xs text-muted-foreground">Optional - defaults to admin email</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={phoneValue}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567" 
                maxLength={14}
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                name="address" 
                placeholder="123 Healthcare Blvd" 
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city" 
                name="city" 
                placeholder="Springfield" 
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                  id="state" 
                  name="state" 
                  placeholder="CA" 
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input 
                  id="zip_code" 
                  name="zip_code" 
                  placeholder="90210" 
                  className="bg-[#FAF8F5] border-[#E8E4DF]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_tier">Patient Tier (Pricing)</Label>
              <Select name="subscription_tier" defaultValue="1-25">
                <SelectTrigger className="bg-[#FAF8F5] border-[#E8E4DF]">
                  <SelectValue placeholder="Select patient tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-25">1-25 patients - $500/month</SelectItem>
                  <SelectItem value="26-50">26-50 patients - $1,000/month</SelectItem>
                  <SelectItem value="51-75">51-75 patients - $1,500/month</SelectItem>
                  <SelectItem value="76-100">76-100 patients - $2,000/month</SelectItem>
                  <SelectItem value="101-125">101-125 patients - $2,500/month</SelectItem>
                  <SelectItem value="126-150">126-150 patients - $3,000/month</SelectItem>
                  <SelectItem value="151-175">151-175 patients - $3,500/month</SelectItem>
                  <SelectItem value="176-200">176-200 patients - $4,000/month</SelectItem>
                  <SelectItem value="201+">201+ patients - Custom pricing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Unlimited staff included in all tiers</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_patients">Max Patients</Label>
              <Input 
                id="max_patients" 
                name="max_patients" 
                type="number"
                defaultValue="25"
                className="bg-[#FAF8F5] border-[#E8E4DF]"
              />
              <p className="text-xs text-muted-foreground">Should match the selected tier</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/super-admin/facilities">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button 
              type="submit" 
              className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Facility"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
