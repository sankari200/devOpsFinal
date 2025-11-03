import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const MedicalDisclaimer = () => {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Important Medical Disclaimer</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          This AI assistant provides <strong>informational guidance only</strong> and is{" "}
          <strong>NOT a substitute for professional medical advice</strong>, diagnosis, or treatment.
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Always consult a qualified healthcare provider for medical concerns</li>
          <li>In case of emergency, call 911 or go to the nearest ER immediately</li>
          <li>This tool may make errors or miss important information</li>
          <li>Your responses are logged for quality assurance and clinician review</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};