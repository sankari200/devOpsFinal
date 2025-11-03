import { AlertCircle, Phone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EmergencyAlertProps {
  symptoms: string[];
}

export const EmergencyAlert = ({ symptoms }: EmergencyAlertProps) => {
  return (
    <Alert variant="destructive" className="border-2 border-destructive animate-pulse">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">⚠️ EMERGENCY SYMPTOMS DETECTED</AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        <p className="font-semibold">
          You reported symptoms that require immediate medical attention:
        </p>
        <ul className="list-disc list-inside space-y-1">
          {symptoms.map((symptom, idx) => (
            <li key={idx} className="font-medium">{symptom}</li>
          ))}
        </ul>
        <div className="pt-2 space-y-2">
          <p className="font-bold text-lg">DO NOT WAIT - SEEK EMERGENCY CARE NOW</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={() => window.open("tel:911")}
            >
              <Phone className="mr-2 h-5 w-5" />
              Call 911
            </Button>
          </div>
          <p className="text-sm">Or go to the nearest emergency room immediately</p>
        </div>
      </AlertDescription>
    </Alert>
  );
};