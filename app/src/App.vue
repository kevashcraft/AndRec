<template>
  <div id="app">
    <div id="window">
      <audio controls ref="audio"></audio>
      <md-button @click="startRecording" class="md-primary md-raised flying-button-start" v-show="state=='standby'">
        Start
      </md-button>
      <md-button @click="saveDialog = true" class="md-primary md-raised flying-button-save" v-show="state=='recording'">
        Save
      </md-button>
      <Spectrogram ref="spectro" :sheight="sheight" class="spectro" />
      <md-dialog :md-active.sync="saveDialog">
        <md-dialog-title>Save as File</md-dialog-title>
        <md-content style="margin: 15px">
          <form @submit.prevent="saveFile">
            <md-field>
              <label>Filename</label>
              <md-input v-model="filename" ref="filename"></md-input>
            </md-field>
            <md-button type="submit" class="md-primary md-raised">Save</md-button>
          </form>
        </md-content>
      </md-dialog>
    </div>
  </div>
</template>

<script>
class WaveProcessorNode extends AudioWorkletNode {
  constructor(context) {
    super(context, 'wave-processor');
  }
}

import Spectrogram from './components/Spectrogram.vue'
import moment from 'moment'

export default {
  name: 'app',
  components: {
    Spectrogram
  },
  created () {
  },
  data () {
    return {
      state: 'standby',
      saveDialog: false,
      audioCtx: false,
      filename: '',
      fftn: 512,
      sheight: 256,
      fftSize: 600 * 256
    }
  },
  watch: {
    saveDialog (b) {
      this.filename = moment().format('dd (MM/DD) HH:mm')
      setTimeout(() => {
        if (b) {
          let input =  this.$refs['filename'].$el
          input.focus()
          input.select()
        }
      }, 150)
    }
  },
  async mounted () {
    this.audioCtx = new AudioContext({sampleRate: 44100})
    await this.audioCtx.audioWorklet.addModule('wave-processor.js')
    this.waveNode = new WaveProcessorNode(this.audioCtx);
    this.waveNode.port.onmessage = evt => {
      let waveData = evt.data.waveData || []
      var blob = new Blob([waveData], {type: 'audio/wav'});
      var objectUrl = URL.createObjectURL(blob);

      var link = document.createElement('a');
      link.setAttribute('href', objectUrl);
      link.setAttribute('download', this.filename + '.wav');
      document.body.appendChild(link);
      link.click();
    }
  },
  methods: {
    async startRecording () {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
      }
      this.state = 'recording'

      if (!!window.cordova) {
        console.log('cordova!!');
        // First check whether we already have permission to access the microphone.
        window.audioinput.checkMicrophonePermission(function(hasPermission) {
          if (hasPermission) {
            this.beginAudio(false)
          } else {
            // Ask the user for permission to access the microphone
            window.audioinput.getMicrophonePermission(function(hasPermission, message) {
              if (hasPermission) {
                console.log("User granted us permission to record.");
                this.beginAudio(false)
              } else {
                console.warn("User denied permission to record.");
              }
            });
          }
        });
      } else {
        navigator
        .mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(this.beginAudio)
      }

    },
    beginAudio (stream) {
      if (stream !== false) {
        let source = this.audioCtx.createMediaStreamSource(stream)
      } else {
        audioinput.start({streamToWebAudio: true})
        let source = audioinput
        // audioinput.connect(audioinput.getAudioContext().destination);
      }

      let splitter = this.audioCtx.createChannelSplitter(2)
      source.connect(splitter)
      let merger = this.audioCtx.createChannelMerger(2)
      splitter.connect(merger)

      merger.connect(this.waveNode)

      let analyzer = this.audioCtx.createAnalyser()
      this.audioAnalyzer = analyzer
      analyzer.fftSize = this.fftn;
      analyzer.smoothingTimeConstant = .3
      this.waveNode.connect(analyzer)

      // analyzer.connect(this.audioCtx.destination)

      this.getData()
    },
    getData () {
      var dataArray = new Uint8Array(this.sheight)
      this.audioAnalyzer.getByteFrequencyData(dataArray);
      this.$refs['spectro'].draw(dataArray)
      window.requestAnimationFrame(this.getData)
    },
    saveFile () {
      this.saveDialog = false
      this.waveNode.port.postMessage('go')
    }
  }
}
</script>

<style lang="scss">
.flying-button-start {
  position: fixed !important;
  // display: block !important;
  top: 30% !important;
  left: 50% !important;
  width: 100px;
  margin-left: -50px !important;
  height: 75px;
  z-index: 10;
}
.flying-button-save {
  position: fixed !important;
  // display: block !important;
  bottom: 30px !important;
  right: 50px !important;
  width: 100px;
  // margin-left: -50px !important;
  height: 75px;
  z-index: 10;
}

#app {
  font-family: 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

#window {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  // border: 1px solid blue;
}

.spectro {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
}
</style>
