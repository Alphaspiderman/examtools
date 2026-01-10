import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Settings,
  Users,
} from 'lucide-react';

import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

import { PWAPrompt } from '@/components/pwa-prompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';

import { AdditionalInfoPhase } from '@/pages/renumeration/phases/additional-info-phase';
import { AdditionalAssignmentsPhase } from '@/pages/renumeration/phases/additional-assignments-phase';
import { ImportPhase } from '@/pages/renumeration/phases/import-phase';
import { ReviewPhase } from '@/pages/renumeration/phases/review-phase';

type Phase = 'import' | 'info' | 'assign' | 'review';

export function RenumerationPage() {
  const [phase, setPhase] = useState<Phase>('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const phases: Phase[] = ['import', 'info', 'assign', 'review'];

  const getNextPhase = (current: Phase): Phase | null => {
    const idx = phases.indexOf(current);
    return idx < phases.length - 1 ? phases[idx + 1] : null;
  };

  const getPreviousPhase = (current: Phase): Phase | null => {
    const idx = phases.indexOf(current);
    return idx > 0 ? phases[idx - 1] : null;
  };

  const getPhaseCompletion = useCallback((phase: Phase): boolean => {
    // Placeholder logic; replace with actual completion checks
    switch (phase) {
      case 'import':
        return true;
      case 'info':
        return true;
      case 'assign':
        return true;
      case 'review':
        return false;
      default:
        return false;
    }
  }, []);

  const canProceedToNext = (current: Phase): boolean => {
    const next = getNextPhase(current);
    return next ? getPhaseCompletion(current) : false;
  };

  const handleContinue = useCallback(() => {
    const next = getNextPhase(phase);
    if (next) setPhase(next);
  }, [phase, getNextPhase]);

  const handleBack = useCallback(() => {
    const prev = getPreviousPhase(phase);
    if (prev) setPhase(prev);
  }, [phase, getPreviousPhase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="border-primary mx-auto size-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground">Processing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              An unexpected error has occurred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              {String(error)}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Compact Phase Navigation */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center">
            {[
              { key: 'import', label: 'Import', icon: Users },
              { key: 'info', label: 'Additional Info', icon: Settings },
              { key: 'assign', label: 'Assignments', icon: Calendar },
              { key: 'review', label: 'Review', icon: CheckCircle },
            ].map(({ key, label, icon: Icon }, index) => {
              const isActive = phase === key;
              const isComplete = getPhaseCompletion(key as Phase);

              return (
                <div
                  key={key}
                  className="flex flex-1 items-center last:flex-none"
                >
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 whitespace-nowrap transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      isComplete &&
                        !isActive &&
                        'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
                      !isActive && !isComplete && 'text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{label}</span>
                    {isComplete && <CheckCircle className="size-4" />}
                  </div>

                  {index < 4 && <div className="bg-border mx-4 h-px flex-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={phase === 'import'}
            >
              <ArrowLeft className="mr-2 size-4" /> Back
            </Button>

            <Button
              onClick={handleContinue}
              disabled={!canProceedToNext(phase)}
            >
              Continue
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Phase Content */}
      <main className="container mx-auto px-4 py-6">
        {phase === 'import' && <ImportPhase />}
        {phase === 'info' && <AdditionalInfoPhase />}
        {phase === 'assign' && <AdditionalAssignmentsPhase />}
        {phase === 'review' && <ReviewPhase />}
      </main>

      <Toaster />
      <PWAPrompt />
    </div>
  );
}
