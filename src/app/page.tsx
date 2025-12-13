import Link from "next/link";
import { ArrowRight, Users, Building2, Heart, Shield, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Family Communication Portal</h1>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Heart className="h-4 w-4" />
            HIPAA-Compliant Family Communication
          </div>
          
          <h1 className="text-5xl md:text-6xl font-light leading-tight">
            Compassionate Care,
            <br />
            <span className="text-primary">Connected Families</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A secure, non-clinical communication platform that keeps families informed and engaged throughout their hospice journey.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/family">
              <Button size="lg" className="gap-2">
                Family Portal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="gap-2">
                Agency Portal
                <Building2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Real-Time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Get instant notifications about visits, deliveries, and care team updates.
              </p>
            </CardContent>
          </Card>

          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Secure Messaging</h3>
              <p className="text-sm text-muted-foreground">
                Communicate directly with your care team through HIPAA-compliant messaging.
              </p>
            </CardContent>
          </Card>

          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">HIPAA Compliant</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security protecting your family's sensitive information.
              </p>
            </CardContent>
          </Card>

          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Family Coordination</h3>
              <p className="text-sm text-muted-foreground">
                Keep all family members informed with role-based access control.
              </p>
            </CardContent>
          </Card>

          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Educational Resources</h3>
              <p className="text-sm text-muted-foreground">
                Access curated content to support your caregiving journey.
              </p>
            </CardContent>
          </Card>

          <Card className="soft-shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Multi-Tenant Platform</h3>
              <p className="text-sm text-muted-foreground">
                Customizable branding and workflows for each hospice agency.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-center space-y-4">
          <h2 className="text-3xl font-light">Ready to get started?</h2>
          <p className="text-muted-foreground">
            Join hospice agencies nationwide in providing exceptional family communication.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 Family Communication Portal. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
