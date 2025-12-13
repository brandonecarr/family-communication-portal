"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, X } from "lucide-react";
import Link from "next/link";
import { addStaffToFacility } from "@/lib/actions/facilities";
import { useToast } from "@/components/ui/use-toast";

interface AddStaffFormProps {
  facilityId: string;
}

export function AddStaffForm({ facilityId }: AddStaffFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    
    try {
      const result = await addStaffToFacility(facilityId, formData);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Staff member invited successfully!",
        });
        router.push(`/super-admin/facilities/${facilityId}?tab=staff`);
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="soft-shadow border-0 bg-white mb-4">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#7A9B8E]" />
          Add Staff Member
        </CardTitle>
        <Link href={`/super-admin/facilities/${facilityId}?tab=staff`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex gap-4">
          <div className="flex-1">
            <Input 
              name="email" 
              type="email"
              placeholder="Email address" 
              required
              className="bg-[#FAF8F5] border-[#E8E4DF]"
            />
          </div>
          <Select name="role" defaultValue="agency_staff">
            <SelectTrigger className="w-40 bg-[#FAF8F5] border-[#E8E4DF]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agency_admin">Admin</SelectItem>
              <SelectItem value="agency_staff">Staff</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            type="submit" 
            className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white gap-2"
            disabled={isSubmitting}
          >
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? "Inviting..." : "Invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
