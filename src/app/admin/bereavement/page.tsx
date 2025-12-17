import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Heart,
  Search,
  Filter,
  Plus,
  Clock,
  Mail,
  Edit,
  Play,
  Pause,
} from "lucide-react";

export default async function AdminBereavementPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle auth errors (including refresh token issues)
  if (error || !user) {
    return redirect("/sign-in");
  }

  // Mock bereavement campaigns data
  const campaigns = [
    {
      id: "1",
      name: "30-Day Bereavement Support",
      description: "Compassionate support sequence for families",
      status: "active",
      email_count: 5,
      duration_days: 30,
      enrolled_count: 12,
    },
    {
      id: "2",
      name: "First Week Support",
      description: "Immediate support in the first week",
      status: "draft",
      email_count: 3,
      duration_days: 7,
      enrolled_count: 0,
    },
  ];

  const statusColors = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
    paused: "bg-[#B8A9D4]/20 text-[#B8A9D4]",
    completed: "bg-[#7A9B8E]/20 text-[#7A9B8E]",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-light mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Bereavement Support
          </h1>
          <p className="text-muted-foreground">
            Manage bereavement campaigns and support sequences
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2 rounded-full">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns?.map((campaign: any) => {
          const config =
            statusColors[campaign.status as keyof typeof statusColors] ||
            statusColors.draft;

          return (
            <Card
              key={campaign.id}
              className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#D4876F]/10 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-[#D4876F]" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {campaign.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {campaign.description}
                          </p>
                        </div>
                        <Badge variant="outline" className={config}>
                          {campaign.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{campaign.email_count || 0} emails</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {campaign.duration_days || 0} day sequence
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          <span>
                            {campaign.enrolled_count || 0} families enrolled
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        {campaign.status === "draft" && (
                          <Button
                            size="sm"
                            className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-1"
                          >
                            <Play className="h-4 w-4" />
                            Launch
                          </Button>
                        )}
                        {campaign.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-1"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="rounded-full">
                          View Activity
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {campaigns?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No campaigns yet
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create your first bereavement support campaign
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
