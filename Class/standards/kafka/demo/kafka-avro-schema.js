const path = require('path')
const { Kafka } = require('kafkajs')
const { SchemaRegistry, SchemaType, avdlToAVSCAsync, readAVSCAsync} = require('@kafkajs/confluent-schema-registry')

const registry = new SchemaRegistry({ host: 'http://localhost:8081' })
const kafka = new Kafka({
  brokers: ['localhost:9092'],
  clientId: 'example-consumer',
})
const consumer = kafka.consumer({ groupId: 'test-group' })
const producer = kafka.producer()

const incomingTopic = 'incoming'
const outgoingTopic = 'outgoing'

const run = async () => {
  const schema = await readAVSCAsync(path.join(__dirname, 'schema.avsc'))
  const { id } = await registry.register({ type: SchemaType.AVRO, schema: JSON.stringify(schema) })

  // const schema = await avdlToAVSCAsync(path.join(__dirname, 'schema.avdl'))
  // const { id } = await registry.register({ type: SchemaType.AVRO, schema: JSON.stringify(schema) })

  await consumer.connect()
  await producer.connect()

  await consumer.subscribe({ topic: incomingTopic })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const decodedMessage = {
        ...message,
        value: await registry.decode(message.value)
      }

      const outgoingMessage = {
        key: message.key,
        value: await registry.encode(id, decodedMessage.value)
      }

      await producer.send({
        topic: outgoingTopic,
        messages: [ outgoingMessage ]
      })
    },
  })
}

run().catch(async e => {
  console.error(e)
  consumer && await consumer.disconnect()
  producer && await producer.disconnect()
  process.exit(1)
})