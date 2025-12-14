import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Trash2,
  Clock,
  Eye
} from "lucide-react";
import Link from "next/link";
import { Database } from "@/types/supabase";

type EducationModule = Database["public"]["Tables"]["education_modules"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch all education modules
  const { data: modules } = await supabase
    .from("education_modules")
    .select("*")
    .order("category", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Content Management
          </h1>
          <p className="text-muted-foreground">
            Manage educational modules and care plan templates
          </p>
        </div>
        <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
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

      {/* Modules List */}
      <div className="grid gap-4">
        {modules?.map((module: EducationModule) => (
          <Card key={module.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-20 w-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {module.thumbnail ? (
                      <img
                        src={module.thumbnail}
                        alt={module.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{module.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {module.description}
                        </p>
                      </div>
                      <Badge className="bg-[#B8A9D4]/20 text-[#B8A9D4]">
                        {module.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {module.estimated_minutes} minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        0 views
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" className="rounded-full gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full">
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full text-red-600 hover:text-red-700 gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {modules?.length === 0 && (
          <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No modules found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Get started by creating your first educational module
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
