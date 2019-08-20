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

import waveProcRaw from '!raw-loader!./assets/wave-processor.js'

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
      isCordova: !document.URL.startsWith('http'),
      filename: '',
      fftn: 512,
      sheight: 256,
      fftSize: 600 * 256
    }
  },
  async mounted () {
    this.audioCtx = new AudioContext({sampleRate: 44100})
      try {
        const worklet = URL.createObjectURL(new Blob([waveProcRaw], {type: 'text/javascript'}))

        await this.audioCtx.audioWorklet.addModule(worklet)
        console.log('WWWWNWLL!!!');
        this.waveNode = new WaveProcessorNode(this.audioCtx);
        console.log('this.waveNode', this.waveNode);
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
      } catch (e) {
        console.log('e', e);
          console.trace();
      }
    },
  watch: {
    saveDialog (b) {
      if (b) {
        this.filename = moment().format('dd (MM/DD) HH:mm')
        setTimeout(() => {
          let input =  this.$refs['filename'].$el
          input.focus()
          input.select()
        }, 150)
      }
    }
  },
  methods: {
    async startRecording () {
      if (!!window.cordova) {
        console.log('cordova!!');
        // First check whether we already have permission to access the microphone.
        window.audioinput.checkMicrophonePermission(hasPermission => {
          if (hasPermission) {
            this.beginAudio(false)
          } else {
            // Ask the user for permission to access the microphone
            window.audioinput.getMicrophonePermission((hasPermission, message) => {
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
    async beginAudio (stream) {
      console.log('this.audioCtx.state', this.audioCtx.state);
      if (this.audioCtx.state !== 'running') {
        await this.audioCtx.resume()
      }
      console.log('this.audioCtx.state', this.audioCtx.state);
      let source

      if (stream) {
        source = this.audioCtx.createMediaStreamSource(stream)
      } else {
        let captureCfg = {
          streamToWebAudio: true,
          audioContext: this.audioCtx,
          normalize: false,
          // sampleRate: 44100,
          // channels: 1,
          // audioSourceType: 1,
          debug: true
        }

        audioinput.start(captureCfg)
        source = audioinput
      }

      this.state = 'recording'

      let splitter = this.audioCtx.createChannelSplitter(2)
      let merger = this.audioCtx.createChannelMerger(2)

      // console.log('source', source);
      // console.log('sourceGA', source.getAudioContext());
      let analyzer = this.audioCtx.createAnalyser()
      this.audioAnalyzer = analyzer
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0
      // console.log('this.audioAnalyzer', this.audioAnalyzer);

      // source.connect(this.waveNode)
      source.connect(splitter)
      splitter.connect(merger)
      // source.connect(analyzer)
      merger.connect(this.waveNode)
      this.waveNode.connect(analyzer)
      // this.waveNode.connect(this.audioCtx.destination)
      analyzer.connect(this.audioCtx.destination)

	// var processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
	// analyzer.connect( this.audioCtx.createMediaStreamDestination() );
  // processorNode.connect(this.audioCtx.destination);
  // setInterval(() => {
  //     var dataArray = new Uint8Array(256)
  //     analyzer.getByteFrequencyData(dataArray);
  //     console.log('dataArray', dataArray);
  //     // console.log('dataArray', dataArray);
  //     // this.$refs['spectro'].draw(dataArray)
  //     // window.requestAnimationFrame(this.getData)
  // }, 1000)


// if (!!this.waveNode) {
      //   merger.connect(this.waveNode)
      //   this.waveNode.connect(analyzer)
      // } else {
      //   merger.connect(analyzer)
      // }

      // analyzer.connect(this.audioCtx.destination)

      this.getData()
    },
    getData () {
      var dataArray = new Uint8Array(this.sheight)
      this.audioAnalyzer.getByteFrequencyData(dataArray);
      // console.log('dataArray', dataArray);
      this.$refs['spectro'].draw(dataArray)
      window.requestAnimationFrame(this.getData)
    },
    saveFile () {
      this.saveDialog = false
      this.waveNode.port.postMessage('go')
    }
  }
}


function onAudioInput( evt ) {
    // 'evt.data' is an integer array containing raw audio data
    //
    console.log( "Audio data received: " + evt.data.length + " samples", evt );

    // ... do something with the evt.data array ...
}

// Listen to audioinput events
window.addEventListener( "audioinput", onAudioInput, false );

var onAudioInputError = function( error ) {
    alert( "onAudioInputError event recieved: " + JSON.stringify(error) );
};

// Listen to audioinputerror events
window.addEventListener( "audioinputerror", onAudioInputError, false );


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
