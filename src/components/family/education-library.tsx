"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";

interface Module {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  estimated_minutes: number;
  category: string;
  content_url?: string;
}

interface ModuleProgress {
  module_id: string;
  progress: number;
  completed: boolean;
}

export default function EducationLibrary() {
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, ModuleProgress>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchModulesAndProgress();
  }, []);

  const fetchModulesAndProgress = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      // Fetch modules
      const { data: modulesData } = await supabase
        .from("education_modules")
        .select("*")
        .order("category", { ascending: true });

      if (modulesData) {
        setModules(modulesData);
      }

      // Fetch user progress
      const { data: progressData } = await supabase
        .from("module_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressData) {
        const progressMap: Record<string, ModuleProgress> = {};
        progressData.forEach((p) => {
          progressMap[p.module_id] = p;
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = async (moduleId: string) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const currentProgress = progress[moduleId]?.progress || 0;

      // If not started, mark as started
      if (currentProgress === 0) {
        const { error } = await supabase.from("module_progress").upsert({
          user_id: user.id,
          module_id: moduleId,
          progress: 10,
          completed: false,
        });

        if (!error) {
          setProgress({
            ...progress,
            [moduleId]: { module_id: moduleId, progress: 10, completed: false },
          });
        }
      }

      // Open module content (would navigate to module page in real app)
      toast({
        title: "Module opened",
        description: "Your progress is being tracked",
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleMarkComplete = async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { error } = await supabase.from("module_progress").upsert({
        user_id: user.id,
        module_id: moduleId,
        progress: 100,
        completed: true,
      });

      if (!error) {
        setProgress({
          ...progress,
          [moduleId]: { module_id: moduleId, progress: 100, completed: true },
        });

        toast({
          title: "Module completed!",
          description: "Great job on completing this module",
        });
      }
    } catch (error) {
      console.error("Error marking complete:", error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading modules...</div>;
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No modules available</h3>
        <p className="text-sm text-muted-foreground">
          Educational content will appear here when available
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {modules.map((module) => {
        const moduleProgress = progress[module.id];
        const isCompleted = moduleProgress?.completed || false;
        const progressValue = moduleProgress?.progress || 0;

        return (
          <Card
            key={module.id}
            className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden group hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:scale-[1.02] transition-all cursor-pointer"
            onClick={() => handleModuleClick(module.id)}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={module.thumbnail}
                alt={module.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <Badge variant="secondary" className="bg-white/90 text-foreground">
                  {module.category}
                </Badge>
                {isCompleted ? (
                  <div className="h-8 w-8 rounded-full bg-[#7A9B8E] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-4 w-4 text-foreground ml-0.5" />
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-1 line-clamp-2" style={{ fontFamily: 'Fraunces, serif' }}>
                  {module.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {module.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{module.estimated_minutes} minutes</span>
              </div>

              {progressValue > 0 && !isCompleted && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              )}

              {!isCompleted && progressValue > 0 && (
                <button
                  onClick={(e) => handleMarkComplete(module.id, e)}
                  className="w-full text-sm text-[#7A9B8E] hover:text-[#6A8B7E] font-medium"
                >
                  Mark as Complete
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
