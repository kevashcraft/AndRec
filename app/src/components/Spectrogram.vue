<template>
  <div>
    <canvas
      ref="canvas"
      :width="canvasWidth"
      :height="sheight"
      ></canvas>
  </div>
</template>

<style lang="scss">
  canvas {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border: 4px dashed black;
    // height: 256px !important;
  }
</style>

<script>
export default {
  name: 'Spectrogram',
  props: {
    sheight: Number
  },
  data () {
    return {
      canvasWidth: 600,
    }
  },
  mounted () {
    this.canvasWidth = window.innerWidth
    this.canvas = this.$refs['canvas']
    this.ctx = this.canvas.getContext('2d')
  },
  methods: {
    draw (data) {
      let imageData = this.ctx.getImageData(1, 0, this.canvas.width - 1, this.sheight)
      // this.ctx.clearRect(0, 0, this.canvas.width, this.sheight)
      this.ctx.putImageData(imageData, 0, 0)
      // let startIdx = this.data.length - (30 * this.sheight)
      // console.log('startIdx', startIdx, this.data.length, this.canvasWidth, this.sheight);
      let x = this.canvas.width - 1
      // console.log('x', x);
      let y = 0
      for (let idx = 0; idx < data.length; idx++) {
        const v = data[idx];
        let magnitude = Math.abs(Math.log(v+3))
        // let magnitude = v
        let r = Math.min(Math.round(magnitude*5), 255)
        let g = Math.min(Math.round(magnitude*50), 255)
        let b = Math.min(Math.round(magnitude*5), 255)

        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        this.ctx.fillRect(x, y, 1, 1)
        y++
        if (y >= this.sheight) {
          x++
          y = 0
        }
      }
    }
  }
}
</script>
