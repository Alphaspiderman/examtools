import type JSZip from 'jszip';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Settings,
  Users,
} from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';

import type { Faculty } from '@/types';

import { readSlotAttendance } from '@/lib/renumeration';
import { readTextFile } from '@/lib/zip';
import { cn } from '@/lib/utils';
import { loadZip } from '@/lib/zip';

import { PWAPrompt } from '@/components/pwa-prompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';

import { AdditionalAssignmentsPhase } from '@/pages/renumeration/phases/additional-assignments-phase';
import { AdditionalInfoPhase } from '@/pages/renumeration/phases/additional-info-phase';
import { ImportPhase } from '@/pages/renumeration/phases/import-phase';
import { ReviewPhase } from '@/pages/renumeration/phases/review-phase';

type Phase = 'import' | 'info' | 'assign' | 'review';

export function RenumerationPage() {
  const [phase, setPhase] = useState<Phase>('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Zip file state
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [zipTimestamps, setZipTimestamps] = useState<{
    updated?: string;
    created?: string;
  } | null>(null);

  // Imported data state
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [importChecks, setImportChecks] = useState<any | null>(null);

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
        // Need to configure the additional checks we are running onImportZip
        return zipInstance !== null;
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

  const onImportZip = useCallback(async (f: File | null) => {
    if (!f) return;
    setLoading(true);
    try {
      const zip = await loadZip(f);
      setZipInstance(zip as any);
      setZipFileName(f.name);
      // persist ZIP in localStorage
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const dataUrl = reader.result as string;
            localStorage.setItem('renumeration:zip:dataUrl', dataUrl);
            localStorage.setItem('renumeration:zip:name', f.name);
          } catch (err) {
            console.warn('Failed to persist ZIP to localStorage', err);
          }
        };
        reader.readAsDataURL(f);
      } catch (err) {
        console.warn('Failed to create data URL for ZIP', err);
      }

      // read last_modified timestamp
      try {
        const lm =
          zip.file('last_modified.txt') ||
          zip.file('internal/last_modified.txt');
        if (lm) {
          const text = await lm.async('string');
          setZipTimestamps({ updated: text });
        }
      } catch (err) {
        // ignore
      }

      // Extract data from ZIP and run verification checks
      const checks = await runImportChecks(zip as any);
      setImportChecks(checks);
      // populate faculty list if present
      if (checks && checks.faculty && checks.faculty.length > 0) {
        setFacultyList(checks.faculty);
      }
      console.log('Loaded ZIP');
    } catch (err) {
      console.error('Failed to load ZIP', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Run a set of verification checks against the zip's metadata
  const runImportChecks = async (zip: JSZip) => {
    const result: any = {
      slotsFound: false,
      slotsCount: 0,
      facultyCount: 0,
      missingAttendanceSlots: [] as Array<{ day: number; slot: number }>,
      missingSubjectInfoSlots: [] as Array<{ day: number; slot: number; missing: string[] }>,
      faculty: [] as Faculty[],
    };

    try {
      const metaText =
        (await readTextFile(zip as any, 'internal/metadata.json')) ||
        (await readTextFile(zip as any, 'metadata.json'));
      if (!metaText) return result;
      const obj = JSON.parse(metaText);
      const slots = Array.isArray(obj.slots)
        ? obj.slots
        : Array.isArray(obj.dutySlots)
        ? obj.dutySlots
        : [];
      const facultyArr = Array.isArray(obj.faculty)
        ? obj.faculty
        : Array.isArray(obj.facultyList)
        ? obj.facultyList
        : [];

      result.slotsFound = slots.length > 0;
      result.slotsCount = slots.length;
      result.facultyCount = facultyArr.length;
      result.faculty = facultyArr.map((f: any, idx: number) => ({
        sNo: Number(f.sNo || idx + 1),
        facultyName: String(f.facultyName || ''),
        facultyId: String(f.facultyId || ''),
        designation: String(f.designation || ''),
        department: String(f.department || ''),
        phoneNo: String(f.phoneNo || ''),
      }));

      // Check each slot for attendance and subject info
      await Promise.all(
        slots.map(async (s: any) => {
          const day = Number(s.day);
          const slot = Number(s.slot);
          try {
            const att = await readSlotAttendance(zip as any, day, slot);
            if (!att || !att.entries || att.entries.length === 0) {
              result.missingAttendanceSlots.push({ day, slot });
            }
          } catch (err) {
            result.missingAttendanceSlots.push({ day, slot });
          }

          const missing: string[] = [];
          if (!s.subjectCode) missing.push('subjectCode');
          if (!s.subjectNames && !s.subjectName) missing.push('subjectNames');
          if (missing.length > 0) {
            result.missingSubjectInfoSlots.push({ day, slot, missing });
          }
        })
      );
    } catch (err) {
      console.warn('runImportChecks failed', err);
    }

    return result;
  };

  const onZipReset = useCallback(() => {
    // clear persisted zip and reset state
    localStorage.removeItem('renumeration:zip:dataUrl');
    localStorage.removeItem('renumeration:zip:name');
    setZipInstance(null);
    setZipFileName(null);
    setZipTimestamps(null);
    setPhase('import');
  }, []);

  // on mount, try to restore persisted zip from localStorage
  useEffect(() => {
    const dataUrl = localStorage.getItem('renumeration:zip:dataUrl');
    const name = localStorage.getItem('renumeration:zip:name');
    if (!dataUrl) return;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(dataUrl);
        const buffer = await resp.arrayBuffer();
        const f = new File([buffer], name || 'attendance.zip', {
          type: 'application/zip',
        });
        const zip = await loadZip(f);
        setZipInstance(zip as any);
        setZipFileName(name || 'attendance.zip');
        // Restore state in a similar manner to onImportZip
        try {
          const checks = await runImportChecks(zip as any);
          setImportChecks(checks);
          if (checks && checks.faculty && checks.faculty.length > 0) {
            setFacultyList(checks.faculty);
          }
        } catch (err) {
          console.warn('Failed to run import checks on restore', err);
        }
      } catch (err) {
        console.warn('Failed to restore ZIP from storage', err);
      }
      setLoading(false);
    })();
  }, []);

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
        {phase === 'import' && (
          <ImportPhase
            zipFileName={zipFileName}
            zipTimestamps={zipTimestamps}
            onImport={onImportZip}
            onReset={onZipReset}
          />
        )}
        {phase === 'info' && <AdditionalInfoPhase />}
        {phase === 'assign' && <AdditionalAssignmentsPhase />}
        {phase === 'review' && <ReviewPhase />}
      </main>

      <Toaster />
      <PWAPrompt />
    </div>
  );
}
