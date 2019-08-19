/*
    AudioWorklet to create a 16bit PCM .wav file
    - expects single-channel audio / only processed first channel of first input
    - does not output any audio
*/
const sampleRate = 44100
const maxSeconds = 300
const bufferSize = sampleRate * maxSeconds

class WaveProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.reset()
        console.log('GOING!!!!');
        this.port.onmessage = (event) => {
            if (event.data === 'go') {
                this.go()
            }
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0];

        input.forEach(data => {
            this.dataIdx++
            this.dataBuffer[this.dataIdx] = data
        })
        outputs[0][0].set(input)
        // console.log('inputs', inputs);
        // console.log('outputs', outputs);
        return true
    }

    go () {
        const samples = this.dataBuffer.slice(0, this.dataIdx)
        let waveData = arrayToWave(samples)
        this.port.postMessage({waveData})
    }

    reset () {
        this.dataBuffer = new Float32Array(bufferSize)
        this.dataIdx = 0
    }
}

registerProcessor('wave-processor', WaveProcessor);


/*
Thanks to Jam3!
Extracted from: https://github.com/Jam3/audiobuffer-to-wav
*/

function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}

function arrayToWave(samples) {
    const numChannels = 1
    const format = 1
    const bitDepth = 16
    const sampleRate = 44100
    const offsetStart = 44

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const buffer = new ArrayBuffer(offsetStart + samples.length * bytesPerSample)
    const view = new DataView(buffer)

    /* RIFF identifier */
    writeString(view, 0, 'RIFF')
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true)
    /* RIFF type */
    writeString(view, 8, 'WAVE')
    /* format chunk identifier */
    writeString(view, 12, 'fmt ')
    /* format chunk length */
    view.setUint32(16, 16, true)
    /* sample format (raw) */
    view.setUint16(20, format, true)
    /* channel count */
    view.setUint16(22, numChannels, true)
    /* sample rate */
    view.setUint32(24, sampleRate, true)
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true)
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true)
    /* bits per sample */
    view.setUint16(34, bitDepth, true)
    /* data chunk identifier */
    writeString(view, 36, 'data')
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true)

    // floatTo16BitPCM(view, offsetStart, samples)
    let offset = offsetStart
    for (let i = 0; i < samples.length; i++ , offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }

    return buffer
}
