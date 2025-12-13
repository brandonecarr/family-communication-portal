"use client";

import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const carePlanSections = [
  {
    id: "overview",
    title: "What is Hospice Care?",
    content: `Hospice care is specialized care focused on providing comfort and support to individuals with life-limiting illnesses. Our team works together to manage symptoms, provide emotional and spiritual support, and help families navigate this journey with dignity and compassion.`,
  },
  {
    id: "services",
    title: "Services Provided",
    content: `Our comprehensive hospice services include:

• Skilled nursing care for symptom management
• Personal care assistance with daily activities
• Physical, occupational, and speech therapy as needed
• Medical social work and counseling services
• Spiritual care and support
• Medication and medical equipment
• 24/7 on-call support for urgent needs
• Bereavement support for families`,
  },
  {
    id: "team",
    title: "Your Care Team",
    content: `Your loved one's care is provided by an interdisciplinary team of professionals:

• Registered Nurses (RN) - Coordinate care and manage symptoms
• Home Health Aides (HHA) - Assist with personal care
• Social Workers - Provide emotional support and resources
• Chaplains - Offer spiritual care and guidance
• Therapists - Help maintain comfort and function
• Physicians - Oversee medical care and treatment plans
• Volunteers - Provide companionship and respite`,
  },
  {
    id: "visits",
    title: "Visit Schedule",
    content: `Visit frequency is tailored to your loved one's needs and may include:

• Regular nursing visits (typically 1-3 times per week)
• Aide visits for personal care (as scheduled)
• Therapy visits as prescribed
• Social work and chaplain visits as needed
• Additional visits during times of increased need

The care team will communicate any changes to the schedule and can adjust visits based on changing needs.`,
  },
  {
    id: "medications",
    title: "Medication Management",
    content: `All medications related to the hospice diagnosis are provided by our pharmacy partner:

• Medications are delivered directly to your home
• Our nurses will review medications during each visit
• Changes to medications require physician approval
• Emergency medications are available 24/7
• Keep medications in a safe, accessible location

Contact your nurse if you have questions about any medication.`,
  },
  {
    id: "equipment",
    title: "Medical Equipment & Supplies",
    content: `We provide necessary medical equipment and supplies:

• Hospital bed, wheelchair, walker as needed
• Oxygen equipment if prescribed
• Personal care supplies (gloves, wipes, pads)
• Wound care supplies
• Comfort items

Request additional supplies through the portal or by calling your nurse.`,
  },
  {
    id: "emergency",
    title: "When to Call",
    content: `Contact your hospice team:

• For new or worsening symptoms
• Questions about medications
• Equipment problems or supply needs
• Emotional or spiritual support needs
• Any concerns about your loved one's comfort

24/7 On-Call Support: Available anytime for urgent needs

Call 911 only for life-threatening emergencies requiring immediate intervention.`,
  },
];

export default function CarePlanOverview() {
  return (
    <Card className="soft-shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Care Plan Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {carePlanSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="font-semibold text-left">{section.title}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Need more information?</strong> Contact your care team
            anytime through the messaging portal or call our 24/7 support line.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
