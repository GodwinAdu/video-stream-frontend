import * as mediasoupClient from 'mediasoup-client'
import type { Device, Transport, Producer, Consumer } from 'mediasoup-client/lib/types'
import type { Socket } from 'socket.io-client'

export class SFUClient {
  private device?: Device
  private sendTransport?: Transport
  private recvTransport?: Transport
  private producers = new Map<string, Producer>()
  private consumers = new Map<string, Consumer>()

  async init(socket: Socket, roomId: string) {
    const { rtpCapabilities } = await new Promise<any>((resolve, reject) => {
      socket.emit('getRouterRtpCapabilities', { roomId }, (response: any) => {
        if (response.error) reject(new Error(response.error))
        else resolve(response)
      })
    })

    this.device = new mediasoupClient.Device()
    await this.device.load({ routerRtpCapabilities: rtpCapabilities })

    await this.createSendTransport(socket, roomId)
    await this.createRecvTransport(socket, roomId)
  }

  private async createSendTransport(socket: Socket, roomId: string) {
    const transportInfo = await new Promise<any>((resolve, reject) => {
      socket.emit('createWebRtcTransport', { roomId, direction: 'send' }, (response: any) => {
        if (response.error) reject(new Error(response.error))
        else resolve(response)
      })
    })

    this.sendTransport = this.device!.createSendTransport(transportInfo)

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise<void>((resolve, reject) => {
          socket.emit('connectWebRtcTransport', {
            transportId: this.sendTransport!.id,
            dtlsParameters,
          }, (response: any) => {
            if (response.error) reject(new Error(response.error))
            else resolve()
          })
        })
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })

    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await new Promise<any>((resolve, reject) => {
          socket.emit('produce', {
            transportId: this.sendTransport!.id,
            kind,
            rtpParameters,
          }, (response: any) => {
            if (response.error) reject(new Error(response.error))
            else resolve(response)
          })
        })
        callback({ id })
      } catch (error) {
        errback(error as Error)
      }
    })
  }

  private async createRecvTransport(socket: Socket, roomId: string) {
    const transportInfo = await new Promise<any>((resolve, reject) => {
      socket.emit('createWebRtcTransport', { roomId, direction: 'recv' }, (response: any) => {
        if (response.error) reject(new Error(response.error))
        else resolve(response)
      })
    })

    this.recvTransport = this.device!.createRecvTransport(transportInfo)

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise<void>((resolve, reject) => {
          socket.emit('connectWebRtcTransport', {
            transportId: this.recvTransport!.id,
            dtlsParameters,
          }, (response: any) => {
            if (response.error) reject(new Error(response.error))
            else resolve()
          })
        })
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })
  }

  async produce(track: MediaStreamTrack) {
    if (!this.sendTransport) throw new Error('Send transport not created')

    const producer = await this.sendTransport.produce({ track })
    this.producers.set(producer.id, producer)
    return producer
  }

  async consume(socket: Socket, producerId: string) {
    if (!this.recvTransport || !this.device) throw new Error('Not initialized')

    const consumerInfo = await new Promise<any>((resolve, reject) => {
      socket.emit('consume', {
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities,
      }, (response: any) => {
        if (response.error) reject(new Error(response.error))
        else resolve(response)
      })
    })

    const consumer = await this.recvTransport.consume(consumerInfo)
    this.consumers.set(consumer.id, consumer)

    await new Promise<void>((resolve, reject) => {
      socket.emit('resumeConsumer', { consumerId: consumer.id }, (response: any) => {
        if (response.error) reject(new Error(response.error))
        else resolve()
      })
    })

    return consumer
  }

  close() {
    this.sendTransport?.close()
    this.recvTransport?.close()
    this.producers.clear()
    this.consumers.clear()
  }
}
