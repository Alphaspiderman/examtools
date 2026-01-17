import { Check, CircleAlert, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ImportPhaseProps {
  zipFileName: string | null;
  zipTimestamps?: { updated?: string; created?: string } | null;
  onImport: (file: File | null) => Promise<void>;
  onReset: () => void;
  checks?: any | null;
  facultyList?: any[];
}

export function ImportPhase({
  zipFileName,
  zipTimestamps,
  onImport,
  onReset,
  checks,
  facultyList,
}: ImportPhaseProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Renumeration Tool</CardTitle>
        <CardDescription>
          Import final ZIP with all attendance marked to generate renumeration
          export.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              /* highlight when dragging */
              'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input
              id="zipfile"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) =>
                onImport(e.target.files ? e.target.files[0] : null)
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />

            <div className="space-y-3">
              <Upload className="text-muted-foreground mx-auto size-12" />
              <div>
                <p className="text-sm font-medium">
                  Drag and drop your ZIP file here
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  or click to browse files (.zip)
                </p>
              </div>
              <div className="text-muted-foreground text-sm">
                {zipFileName || 'No ZIP loaded'}
              </div>
            </div>
          </div>
          {zipFileName && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                <div className="font-medium">{zipFileName}</div>
                {zipTimestamps?.updated && (
                  <div className="text-xs">
                    Last updated: {zipTimestamps.updated}
                  </div>
                )}
              </div>
              <div>
                <Button variant="destructive" size="sm" onClick={onReset}>
                  Reset ZIP
                </Button>
              </div>
            </div>
          )}
          {checks && (
            <div className="mt-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Verification</div>
                <ul className="space-y-2 text-sm">
                  <li>
                    {checks.slotsFound ? (
                      <Check className="mr-2 inline-block size-4 text-green-600" />
                    ) : (
                      <CircleAlert className="mr-2 inline-block size-4 text-red-600" />
                    )}
                    Slots found: {checks.slotsCount ?? 0}
                  </li>
                  <li>
                    {checks.facultyCount && checks.facultyCount > 0 ? (
                      <Check className="mr-2 inline-block size-4 text-green-600" />
                    ) : (
                      <CircleAlert className="mr-2 inline-block size-4 text-red-600" />
                    )}
                    Faculty entries: {checks.facultyCount ?? 0}
                  </li>
                  <li>
                    {checks.missingAttendanceSlots &&
                    checks.missingAttendanceSlots.length === 0 ? (
                      <Check className="mr-2 inline-block size-4 text-green-600" />
                    ) : (
                      <CircleAlert className="mr-2 inline-block size-4 text-red-600" />
                    )}
                    Attendance present for all slots:{' '}
                    {checks.missingAttendanceSlots
                      ? checks.missingAttendanceSlots.length
                      : 'N/A'}{' '}
                    missing
                  </li>
                  <li>
                    {checks.missingSubjectInfoSlots &&
                    checks.missingSubjectInfoSlots.length === 0 ? (
                      <Check className="mr-2 inline-block size-4 text-green-600" />
                    ) : (
                      <CircleAlert className="mr-2 inline-block size-4 text-red-600" />
                    )}
                    Subject info complete:{' '}
                    {checks.missingSubjectInfoSlots
                      ? checks.missingSubjectInfoSlots.length
                      : 'N/A'}{' '}
                    issues
                  </li>
                </ul>

                {checks.missingAttendanceSlots &&
                  checks.missingAttendanceSlots.length > 0 && (
                    <div className="mt-3 text-xs text-red-600">
                      Missing attendance for slots:{' '}
                      {checks.missingAttendanceSlots
                        .slice(0, 3)
                        .map((s: any) => `d${s.day}-s${s.slot}`)
                        .join(', ')}
                      {checks.missingAttendanceSlots.length > 3
                        ? ` and ${checks.missingAttendanceSlots.length - 3} more`
                        : ''}
                    </div>
                  )}

                {checks.missingSubjectInfoSlots &&
                  checks.missingSubjectInfoSlots.length > 0 && (
                    <div className="mt-3 text-xs text-red-600">
                      Slots with missing subject info:{' '}
                      {checks.missingSubjectInfoSlots
                        .slice(0, 3)
                        .map(
                          (s: any) =>
                            `d${s.day}-s${s.slot}(${s.missing.join(',')})`
                        )
                        .join(', ')}
                      {checks.missingSubjectInfoSlots.length > 3
                        ? ` and ${checks.missingSubjectInfoSlots.length - 3} more`
                        : ''}
                    </div>
                  )}
                {facultyList && facultyList.length > 0 && (
                  <div className="text-muted-foreground mt-3 text-xs">
                    Faculty sample:{' '}
                    {facultyList
                      .slice(0, 3)
                      .map((f: any) => f.facultyName)
                      .join(', ')}
                    {facultyList.length > 3
                      ? ` and ${facultyList.length - 3} more`
                      : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
