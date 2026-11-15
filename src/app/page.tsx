import { getAppUser } from "@/lib/auth/provision";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, MessageSquare, BarChart3, Shield, FileText, Settings, Brain, Zap, ShieldCheck, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Authorize against the app-level role in the `users` table.
  // Neon Auth's session.user.role is always "user", so it cannot be used here.
  let appUser = null;
  try {
    appUser = await getAppUser();
  } catch (error) {
    console.error('[HomePage] getAppUser error:', error);
  }

  if (appUser) {
    if (appUser.role === "admin") {
      redirect("/admin/lti/platforms");
    } else if (appUser.role === "teacher") {
      redirect("/teacher/dashboard");
    } else if (appUser.role === "student") {
      redirect("/student/classes");
    } else if (appUser.role === "parent") {
      redirect("/parent/children");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Educational Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Personalized Learning <br />
              <span className="text-primary">Powered by AI</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform education with intelligent tutoring, real-time analytics, 
              and seamless LMS integration. Built for modern classrooms.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/sign-in">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span>FERPA & COPPA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-success" />
                <span>LTI 1.3 Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-success" />
                <span>OpenRouter Free Models</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for teachers, students, and administrators
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Smart Classrooms", desc: "Create and manage classes with AI-assisted lesson planning and automated grading." },
              { icon: Users, title: "Student Analytics", desc: "Real-time insights into student progress, engagement, and learning patterns." },
              { icon: MessageSquare, title: "AI Tutoring", desc: "Personalized 1-on-1 tutoring sessions powered by frontier LLMs via OpenRouter." },
              { icon: BarChart3, title: "Progress Tracking", desc: "Detailed reports and dashboards for teachers, parents, and administrators." },
              { icon: Shield, title: "LTI 1.3 Integration", desc: "Seamless Canvas, Google Classroom, and LMS integration with NRPS & AGS." },
              { icon: FileText, title: "Compliance Ready", desc: "Built-in FERPA, COPPA, and GDPR compliance with audit trails." },
            ].map((feature, i) => (
              <Card key={i} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-3" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Designed for Every Role</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tailored experiences for teachers, students, parents, and administrators
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { 
                icon: BookOpen, 
                title: "Teachers", 
                desc: "Dashboard, class management, session monitoring, analytics, LTI deployment",
                href: "/teacher/dashboard",
                color: "purple"
              },
              { 
                icon: Users, 
                title: "Students", 
                desc: "My classes, tutoring sessions, artifacts, notifications, progress tracking",
                href: "/student/classes",
                color: "green"
              },
              { 
                icon: Shield, 
                title: "Parents", 
                desc: "Children overview, consent management, progress reports, notifications",
                href: "/parent/children",
                color: "yellow"
              },
              { 
                icon: Settings, 
                title: "Admins", 
                desc: "Districts, LTI platforms, audit logs, retention policies, user management",
                href: "/admin/lti/platforms",
                color: "red"
              },
            ].map((role, i) => (
              <Card key={i} className="h-full hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <role.icon className={`h-10 w-10 text-${role.color}-500 mb-3 group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription className="text-sm">{role.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href={role.href}>Explore {role.title} Portal →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Learning?</h2>
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of educators using AI Tutor Platform to personalize 
            education at scale.
          </p>
          <Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
            <Link href="/sign-in">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                <span className="text-primary">AI</span>Tutor
              </Link>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                Multi-tenant educational AI platform for personalized learning.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/teacher/dashboard" className="hover:text-foreground">Teacher Dashboard</Link></li>
                <li><Link href="/student/classes" className="hover:text-foreground">Student Portal</Link></li>
                <li><Link href="/parent/children" className="hover:text-foreground">Parent Portal</Link></li>
                <li><Link href="/admin/lti/platforms" className="hover:text-foreground">Admin Console</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Compliance</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>FERPA Compliant</li>
                <li>COPPA Compliant</li>
                <li>GDPR Ready</li>
                <li>LTI 1.3 Certified</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Community Forum</li>
                <li>Status Page</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} AI Tutor Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}