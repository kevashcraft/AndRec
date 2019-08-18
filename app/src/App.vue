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
          <form @submit.prevent="saveFile($event)">
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
      filenameStr: moment().format('dd (MM/DD) HH:mm'),
      fftn: 512,
      sheight: 256,
      fftSize: 600 * 256
    }
  },
  mounted () {
    this.filename = this.filenameStr
  },
  watch: {
    saveDialog (b) {
      setTimeout(() => {
        if (b) {
          let input =  this.$refs['filename'].$el
          input.focus()
          input.select()
        }
      }, 150)
    }
  },
  methods: {
    startRecording () {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext()
      }
      this.state = 'recording'

      navigator
      .mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.beginAudio)

    },
    beginAudio (stream) {
      let source = this.audioCtx.createMediaStreamSource(stream)
      let splitter = this.audioCtx.createChannelSplitter(2)
      source.connect(splitter)
      let merger = this.audioCtx.createChannelMerger(2)
      splitter.connect(merger)

      let analyzer = this.audioCtx.createAnalyser()
      merger.connect(analyzer)

      this.chunks = []
      this.mediaRecorder = new MediaRecorder(stream)
      this.mediaRecorder.ondataavailable = evt => {
        this.chunks.push(evt.data)
      }
      this.mediaRecorder.onstop = (evt) => {
        let chunks = this.chunks
        console.log('stopped!');
        // Make blob out of our blobs, and open it.
        var blob = new Blob(this.chunks, { 'type' : 'audio/mp3; codecs=mp3' });
        let encodedUri = URL.createObjectURL(blob);
        this.$refs['audio'].src = encodedUri
        var link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', this.filename + '.mp3');
        document.body.appendChild(link); // Required for FF
        link.click(); // This will download the data file named "my_data.csv".

        this.chunks = []
        this.filename = this.filenameStr
        this.startRecording()
     };
     this.mediaRecorder.start()
      analyzer.fftSize = this.fftn;
      analyzer.smoothingTimeConstant = .3
      source.connect(analyzer)
      this.audioAnalyzer = analyzer
      this.getData()
    },
    getData () {
      var dataArray = new Uint8Array(this.sheight)
      this.audioAnalyzer.getByteFrequencyData(dataArray);
      this.$refs['spectro'].draw(dataArray)
      window.requestAnimationFrame(this.getData)
    },
    saveFile (ev) {
      console.log('ev', ev);
      console.log('saving file');
      this.saveDialog = false
      this.mediaRecorder.stop()
      this.state = 'standby'
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
