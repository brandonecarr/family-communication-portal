import EducationLibrary from "@/components/family/education-library";

export default function EducationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light mb-2">Education & Resources</h1>
        <p className="text-muted-foreground">
          Learn about hospice care and how to support your loved one
        </p>
      </div>
      <EducationLibrary />
    </div>
  );
}
