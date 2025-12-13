import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Palette, 
  Upload,
  Eye,
  Save,
  RotateCcw
} from "lucide-react";

export default async function AdminBrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Branding & Customization
          </h1>
          <p className="text-muted-foreground">
            Customize the look and feel of your family portal
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your logo here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Recommended: PNG or SVG, max 2MB
              </p>
              <Button variant="outline" className="mt-4 rounded-full">
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Primary Color */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Primary Color
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  defaultValue="#7A9B8E"
                  className="h-12 w-20"
                />
                <Input
                  type="text"
                  defaultValue="#7A9B8E"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {['#7A9B8E', '#B8A9D4', '#D4876F', '#6B8E7F', '#A89BC8'].map((color) => (
                <button
                  key={color}
                  className="h-12 rounded-lg border-2 border-transparent hover:border-foreground transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heading-font">Heading Font</Label>
              <Input
                id="heading-font"
                type="text"
                defaultValue="Fraunces"
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-font">Body Font</Label>
              <Input
                id="body-font"
                type="text"
                defaultValue="Plus Jakarta Sans"
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-2xl font-light mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                Heading Preview
              </h3>
              <p className="text-sm text-muted-foreground">
                This is how body text will appear in your portal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
              Custom Domain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Portal Domain</Label>
              <Input
                id="domain"
                type="text"
                placeholder="family.youragency.com"
              />
              <p className="text-sm text-muted-foreground">
                Configure your custom domain for the family portal
              </p>
            </div>

            <div className="bg-[#7A9B8E]/5 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">DNS Configuration</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Add these DNS records to your domain:
              </p>
              <div className="space-y-1 text-xs font-mono bg-muted p-2 rounded">
                <div>Type: CNAME</div>
                <div>Name: family</div>
                <div>Value: portal.hospiceapp.com</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <Palette className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Preview of your customized portal will appear here
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" className="rounded-full gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full">
            Cancel
          </Button>
          <Button className="bg-[#7A9B8E] hover:bg-[#6A8B7E] text-white rounded-full gap-2">
            <Save className="h-4 w-4" />
            Publish Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
