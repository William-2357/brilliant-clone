export interface SimulationProps {
  config: Record<string, number>;
  /** 'explore' shows learner controls; 'verify' runs a batch on runSignal. */
  mode: 'explore' | 'verify';
  /** Increment this to trigger a verify run. */
  runSignal: number;
  /** Fires when a verify run finishes settling. */
  onSettled?: () => void;
}
