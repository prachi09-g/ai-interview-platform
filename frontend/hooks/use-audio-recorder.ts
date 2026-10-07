'use client';

import { useCallback, useRef, useState } from 'react';

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'stopped'
  | 'unsupported'
  | 'permission-denied';

interface RecordingResult {
  blob: Blob;
  durationSeconds: number;
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  onstart: (() => void) | null;
  onend: (() => void) | null;

  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;

  onerror:
    | ((event: SpeechRecognitionErrorEventLike) => void)
    | null;

  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useAudioRecorder() {
  const [status, setStatus] =
    useState<RecorderStatus>('idle');

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const speechRecognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const streamRef =
    useRef<MediaStream | null>(null);

  const startTimeRef = useRef(0);

  const resultRef =
    useRef<RecordingResult | null>(null);

  // Confirmed/final speech
  const finalTranscriptRef =
    useRef('');

  // Latest temporary/interim speech
  const interimTranscriptRef =
    useRef('');

  const start = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setStatus('unsupported');
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      chunksRef.current = [];

      resultRef.current = null;

      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';

      // ---------------------------------------------
      // MediaRecorder
      // ---------------------------------------------

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationSeconds =
          (Date.now() -
            startTimeRef.current) /
          1000;

        const blob =
          new Blob(
            chunksRef.current,
            {
              type:
                recorder.mimeType ||
                'audio/webm',
            },
          );

        /*
         * Prefer final transcript.
         *
         * If Chrome hasn't marked the last result
         * final yet, also keep its latest interim
         * result so we don't lose the spoken answer.
         */
        const transcript = [
          finalTranscriptRef.current,
          interimTranscriptRef.current,
        ]
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(
          'Final browser transcript:',
          transcript,
        );

        resultRef.current = {
          blob,
          durationSeconds,
          transcript:
            transcript || undefined,
        };

        streamRef.current
          ?.getTracks()
          .forEach((track) =>
            track.stop(),
          );

        streamRef.current = null;
      };

      // ---------------------------------------------
      // Browser Speech Recognition
      // ---------------------------------------------

      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition =
            new SpeechRecognition();

          recognition.continuous = true;
          recognition.interimResults = true;

          // English interview answers
          recognition.lang = 'en-US';

          recognition.onstart = () => {
            console.log(
              'Browser speech recognition started',
            );
          };

          recognition.onresult = (
            event,
          ) => {
            let interimText = '';

            /*
             * Rebuild final + interim text from the
             * recognition result collection.
             */
            for (
              let i = 0;
              i < event.results.length;
              i++
            ) {
              const result =
                event.results[i];

              const text =
                result[0]?.transcript?.trim();

              if (!text) {
                continue;
              }

              if (result.isFinal) {
                /*
                 * Because we iterate the entire results
                 * collection, build the complete final
                 * transcript rather than appending the
                 * same result repeatedly.
                 */
              } else {
                interimText +=
                  `${text} `;
              }
            }

            let completeFinalText = '';

            for (
              let i = 0;
              i < event.results.length;
              i++
            ) {
              const result =
                event.results[i];

              if (
                result.isFinal &&
                result[0]?.transcript
              ) {
                completeFinalText +=
                  `${result[0].transcript.trim()} `;
              }
            }

            finalTranscriptRef.current =
              completeFinalText.trim();

            interimTranscriptRef.current =
              interimText.trim();

            const liveTranscript = [
              finalTranscriptRef.current,
              interimTranscriptRef.current,
            ]
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();

            console.log(
              'Live browser transcript:',
              liveTranscript,
            );
          };

          recognition.onerror = (
            event,
          ) => {
            console.warn(
              'Browser speech recognition error:',
              event.error,
              event.message ?? '',
            );
          };

          recognition.onend = () => {
            console.log(
              'Browser speech recognition ended',
            );
          };

          speechRecognitionRef.current =
            recognition;

          recognition.start();
        } catch (error) {
          console.warn(
            'Could not start browser speech recognition:',
            error,
          );

          speechRecognitionRef.current =
            null;
        }
      } else {
        console.warn(
          'Browser SpeechRecognition API is unavailable.',
        );
      }

      // ---------------------------------------------
      // Start recording
      // ---------------------------------------------

      startTimeRef.current =
        Date.now();

      recorder.start();

      setStatus('recording');
    } catch (error) {
      console.error(
        'Could not access microphone:',
        error,
      );

      setStatus(
        'permission-denied',
      );
    }
  }, []);

  // -------------------------------------------------
  // Stop
  // -------------------------------------------------

  const stop = useCallback(
    (): Promise<RecordingResult | null> => {
      return new Promise(
        (resolve) => {
          const recorder =
            mediaRecorderRef.current;

          if (
            !recorder ||
            recorder.state ===
              'inactive'
          ) {
            resolve(null);
            return;
          }

          /*
           * Ask SpeechRecognition to finish its
           * current phrase first.
           */
          try {
            speechRecognitionRef.current?.stop();
          } catch {
            // It may already have stopped.
          }

          /*
           * Give Chrome a short moment to emit its
           * final/interim recognition result before
           * MediaRecorder builds RecordingResult.
           */
          window.setTimeout(() => {
            const originalOnStop =
              recorder.onstop as
                | (() => void)
                | null;

            recorder.onstop = () => {
              originalOnStop?.call(
                recorder,
              );

              speechRecognitionRef.current =
                null;

              setStatus('stopped');

              resolve(
                resultRef.current,
              );
            };

            if (
              recorder.state !==
              'inactive'
            ) {
              recorder.stop();
            }
          }, 700);
        },
      );
    },
    [],
  );

  // -------------------------------------------------
  // Reset
  // -------------------------------------------------

  const reset =
    useCallback(() => {
      try {
        speechRecognitionRef.current?.abort();
      } catch {
        // Recognition may already be stopped.
      }

      speechRecognitionRef.current =
        null;

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );

      streamRef.current = null;

      mediaRecorderRef.current =
        null;

      chunksRef.current = [];

      resultRef.current = null;

      finalTranscriptRef.current =
        '';

      interimTranscriptRef.current =
        '';

      setStatus('idle');
    }, []);

  return {
    status,
    start,
    stop,
    reset,
  };
}