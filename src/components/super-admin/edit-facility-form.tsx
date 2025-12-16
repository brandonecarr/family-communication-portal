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
import { Save, X } from "lucide-react";
import Link from "next/link";
import { updateFacility } from "@/lib/actions/facilities";
import { useToast } from "@/components/ui/use-toast";

interface Facility {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier?: string;
  max_patients?: number;
  max_staff?: number;
  status?: string;
}

interface EditFacilityFormProps {
  facility: Facility;
}

export function EditFacilityForm({ facility }: EditFacilityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    
    try {
      const result = await updateFacility(facility.id, formData);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Facility updated successfully!",
        });
        router.push(`/super-admin/facilities/${facility.id}`);
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update facility",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Facility Name *</Label>
          <Input 
            id="name" 
            name="name" 
            defaultValue={facility.name}
            required 
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email" 
            type="email"
            defaultValue={facility.email || ""}
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            name="phone" 
            defaultValue={facility.phone || ""}
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input 
            id="address" 
            name="address" 
            defaultValue={facility.address || ""}
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input 
            id="city" 
            name="city" 
            defaultValue={facility.city || ""}
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input 
              id="state" 
              name="state" 
              defaultValue={facility.state || ""}
              className="bg-[#FAF8F5] border-[#E8E4DF]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">ZIP Code</Label>
            <Input 
              id="zip_code" 
              name="zip_code" 
              defaultValue={facility.zip_code || ""}
              className="bg-[#FAF8F5] border-[#E8E4DF]"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscription_tier">Patient Tier (Pricing)</Label>
          <Select name="subscription_tier" defaultValue={facility.subscription_tier || "1-25"}>
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
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={facility.status || "active"}>
            <SelectTrigger className="bg-[#FAF8F5] border-[#E8E4DF]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_patients">Max Patients</Label>
          <Input 
            id="max_patients" 
            name="max_patients" 
            type="number"
            defaultValue={facility.max_patients || 25}
            className="bg-[#FAF8F5] border-[#E8E4DF]"
          />
          <p className="text-xs text-muted-foreground">Should match the selected tier</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Link href={`/super-admin/facilities/${facility.id}`}>
          <Button type="button" variant="outline" className="gap-2">
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </Link>
        <Button 
          type="submit" 
          className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
