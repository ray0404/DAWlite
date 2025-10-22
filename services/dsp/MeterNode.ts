// A map to track which modules have been added to an AudioContext
const workletModules = new WeakMap<AudioContext, Set<string>>();

/**
 * A custom AudioWorkletNode for metering audio levels.
 * It receives RMS values from the associated AudioWorkletProcessor.
 */
export class MeterNode extends AudioWorkletNode {
    constructor(context: AudioContext, onMeterUpdate: (rms: number) => void) {
        super(context, 'volume-meter-processor', {
            processorOptions: {
                updateIntervalInMS: 100 // ~10fps updates are efficient for UI
            }
        });

        // Listen for messages from the processor
        this.port.onmessage = (event) => {
            if (event.data.rms) {
                onMeterUpdate(event.data.rms);
            }
        };
    }
}

/**
 * Asynchronously creates and initializes a MeterNode.
 * It ensures the associated AudioWorklet module is loaded only once per AudioContext.
 * This version fetches the script manually to bypass potential service worker caching issues.
 * @param audioContext The global AudioContext.
 * @param onMeterUpdate A callback function to handle level updates from the worklet.
 * @returns A promise that resolves to a MeterNode, or null if creation fails.
 */
export const createMeterNode = async (
    audioContext: AudioContext, 
    onMeterUpdate: (rms: number) => void
): Promise<MeterNode | null> => {
    try {
        if (!workletModules.has(audioContext)) {
            workletModules.set(audioContext, new Set());
        }
        const loadedModules = workletModules.get(audioContext)!;

        if (!loadedModules.has('volume-meter-processor')) {
            // Fetch the processor script manually. This is more robust against
            // service worker caching issues or incorrect MIME types that can prevent
            // addModule from working correctly with a URL.
            const response = await fetch('/processors/volume-meter-processor.js');
            if (!response.ok) {
                throw new Error(`Failed to fetch worklet processor: ${response.status} ${response.statusText}`);
            }
            const scriptText = await response.text();
            const blob = new Blob([scriptText], { type: 'application/javascript' });
            const objectURL = URL.createObjectURL(blob);
            
            await audioContext.audioWorklet.addModule(objectURL);
            
            // Clean up the object URL now that the module is loaded.
            URL.revokeObjectURL(objectURL);

            loadedModules.add('volume-meter-processor');
        }
        
        return new MeterNode(audioContext, onMeterUpdate);
    } catch (e) {
        console.error('Failed to create MeterNode:', e);
        return null;
    }
};