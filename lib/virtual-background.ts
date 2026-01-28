export interface VirtualBackgroundOptions {
  type: 'none' | 'blur' | 'image' | 'video'
  blurAmount?: number
  imageUrl?: string
  videoUrl?: string
}

export class VirtualBackgroundProcessor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private segmentationModel: any = null
  private backgroundImage: HTMLImageElement | null = null
  private backgroundVideo: HTMLVideoElement | null = null
  private isProcessing = false

  constructor() {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
  }

  async initialize() {
    try {
      // Load MediaPipe Selfie Segmentation
      const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation')
      this.segmentationModel = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      })
      
      this.segmentationModel.setOptions({
        modelSelection: 1, // 0 for general, 1 for landscape
        selfieMode: true,
      })

      return true
    } catch (error) {
      console.warn('MediaPipe not available, using fallback blur:', error)
      return false
    }
  }

  async setBackground(options: VirtualBackgroundOptions) {
    if (options.type === 'image' && options.imageUrl) {
      this.backgroundImage = new Image()
      this.backgroundImage.crossOrigin = 'anonymous'
      return new Promise<void>((resolve, reject) => {
        this.backgroundImage!.onload = () => resolve()
        this.backgroundImage!.onerror = reject
        this.backgroundImage!.src = options.imageUrl!
      })
    }

    if (options.type === 'video' && options.videoUrl) {
      this.backgroundVideo = document.createElement('video')
      this.backgroundVideo.crossOrigin = 'anonymous'
      this.backgroundVideo.loop = true
      this.backgroundVideo.muted = true
      this.backgroundVideo.src = options.videoUrl
      await this.backgroundVideo.play()
    }
  }

  processFrame(
    inputVideo: HTMLVideoElement,
    options: VirtualBackgroundOptions
  ): HTMLCanvasElement {
    if (this.isProcessing) return this.canvas

    this.isProcessing = true
    
    const { videoWidth, videoHeight } = inputVideo
    this.canvas.width = videoWidth
    this.canvas.height = videoHeight

    if (options.type === 'none') {
      this.ctx.drawImage(inputVideo, 0, 0, videoWidth, videoHeight)
      this.isProcessing = false
      return this.canvas
    }

    if (this.segmentationModel) {
      this.processWithSegmentation(inputVideo, options)
    } else {
      this.processWithFallback(inputVideo, options)
    }

    this.isProcessing = false
    return this.canvas
  }

  private processWithSegmentation(
    inputVideo: HTMLVideoElement,
    options: VirtualBackgroundOptions
  ) {
    this.segmentationModel.onResults((results: any) => {
      const { videoWidth, videoHeight } = inputVideo
      
      // Draw background
      this.drawBackground(options, videoWidth, videoHeight)
      
      // Create person mask
      const imageData = this.ctx.getImageData(0, 0, videoWidth, videoHeight)
      const data = imageData.data
      
      // Apply segmentation mask
      if (results.segmentationMask) {
        const mask = results.segmentationMask
        const maskData = new Uint8ClampedArray(mask.data)
        
        for (let i = 0; i < data.length; i += 4) {
          const maskValue = maskData[i / 4]
          const alpha = maskValue / 255
          
          if (alpha > 0.5) {
            // Keep person pixels
            const tempCanvas = document.createElement('canvas')
            const tempCtx = tempCanvas.getContext('2d')!
            tempCanvas.width = videoWidth
            tempCanvas.height = videoHeight
            tempCtx.drawImage(inputVideo, 0, 0)
            const personData = tempCtx.getImageData(0, 0, videoWidth, videoHeight).data
            
            data[i] = personData[i]     // R
            data[i + 1] = personData[i + 1] // G
            data[i + 2] = personData[i + 2] // B
            data[i + 3] = 255 // A
          }
        }
      }
      
      this.ctx.putImageData(imageData, 0, 0)
    })

    this.segmentationModel.send({ image: inputVideo })
  }

  private processWithFallback(
    inputVideo: HTMLVideoElement,
    options: VirtualBackgroundOptions
  ) {
    const { videoWidth, videoHeight } = inputVideo
    
    if (options.type === 'blur') {
      // Draw background with blur
      this.drawBackground(options, videoWidth, videoHeight)
      
      // Apply simple edge detection for person outline
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.filter = 'none'
      
      // Simple center-weighted mask (fallback)
      const gradient = this.ctx.createRadialGradient(
        videoWidth / 2, videoHeight / 2, videoWidth * 0.2,
        videoWidth / 2, videoHeight / 2, videoWidth * 0.6
      )
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      
      // Draw person in center
      this.ctx.save()
      this.ctx.globalCompositeOperation = 'destination-out'
      this.ctx.fillStyle = gradient
      this.ctx.fillRect(0, 0, videoWidth, videoHeight)
      this.ctx.restore()
      
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.drawImage(inputVideo, 0, 0)
    } else {
      this.drawBackground(options, videoWidth, videoHeight)
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.drawImage(inputVideo, 0, 0)
    }
  }

  private drawBackground(
    options: VirtualBackgroundOptions,
    width: number,
    height: number
  ) {
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.filter = 'none'

    switch (options.type) {
      case 'blur':
        // Create blurred background
        this.ctx.filter = `blur(${options.blurAmount || 10}px)`
        this.ctx.drawImage(this.canvas, 0, 0, width, height)
        this.ctx.filter = 'none'
        break

      case 'image':
        if (this.backgroundImage) {
          // Scale image to cover canvas
          const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height)
          const scaledWidth = this.backgroundImage.width * scale
          const scaledHeight = this.backgroundImage.height * scale
          const x = (width - scaledWidth) / 2
          const y = (height - scaledHeight) / 2
          
          this.ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight)
        }
        break

      case 'video':
        if (this.backgroundVideo) {
          // Scale video to cover canvas
          const scale = Math.max(width / this.backgroundVideo.videoWidth, height / this.backgroundVideo.videoHeight)
          const scaledWidth = this.backgroundVideo.videoWidth * scale
          const scaledHeight = this.backgroundVideo.videoHeight * scale
          const x = (width - scaledWidth) / 2
          const y = (height - scaledHeight) / 2
          
          this.ctx.drawImage(this.backgroundVideo, x, y, scaledWidth, scaledHeight)
        }
        break

      default:
        this.ctx.fillStyle = '#1a1a1a'
        this.ctx.fillRect(0, 0, width, height)
    }
  }

  getProcessedStream(originalStream: MediaStream, options: VirtualBackgroundOptions): MediaStream {
    const videoTrack = originalStream.getVideoTracks()[0]
    if (!videoTrack) return originalStream

    const video = document.createElement('video')
    video.srcObject = originalStream
    video.play()

    const processedCanvas = document.createElement('canvas')
    const processedStream = processedCanvas.captureStream(30)

    // Add audio tracks
    originalStream.getAudioTracks().forEach(track => {
      processedStream.addTrack(track)
    })

    const processFrame = () => {
      if (video.readyState >= 2) {
        const processed = this.processFrame(video, options)
        const ctx = processedCanvas.getContext('2d')!
        processedCanvas.width = processed.width
        processedCanvas.height = processed.height
        ctx.drawImage(processed, 0, 0)
      }
      requestAnimationFrame(processFrame)
    }

    video.addEventListener('loadeddata', () => {
      processFrame()
    })

    return processedStream
  }

  dispose() {
    if (this.segmentationModel) {
      this.segmentationModel.close()
    }
    if (this.backgroundVideo) {
      this.backgroundVideo.pause()
      this.backgroundVideo.src = ''
    }
  }
}

// Predefined backgrounds
export const VIRTUAL_BACKGROUNDS = {
  blur: [
    { name: 'Light Blur', blurAmount: 5 },
    { name: 'Medium Blur', blurAmount: 10 },
    { name: 'Heavy Blur', blurAmount: 20 },
  ],
  images: [
    { name: 'Office', url: '/backgrounds/office.jpg' },
    { name: 'Living Room', url: '/backgrounds/living-room.jpg' },
    { name: 'Library', url: '/backgrounds/library.jpg' },
    { name: 'Beach', url: '/backgrounds/beach.jpg' },
    { name: 'Mountains', url: '/backgrounds/mountains.jpg' },
    { name: 'City', url: '/backgrounds/city.jpg' },
  ],
  videos: [
    { name: 'Animated Office', url: '/backgrounds/office-animated.mp4' },
    { name: 'Nature Loop', url: '/backgrounds/nature-loop.mp4' },
  ]
}