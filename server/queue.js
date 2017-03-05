// this is a fast implementation of a queue in JS
class Queue {
  constructor() {
    this.queue = []
    this.offset = 0
  }

  getLength() {
    return this.queue.length - this.offset
  }

  isEmpty() {
    return this.queue.length == 0
  }
  
  // add to queue
  enqueue(item) {
    this.queue.push(item)
  }

  // returns item from queue, undefined if empty
  dequeue() {
    if (this.isEmpty()) return undefined

    // store the item at the front of the queue
    let item = this.queue[this.offset]

    // increment the offset and remove the free space if necessary
    if (++ this.offset * 2 >= this.queue.length) {
      this.queue = this.queue.slice(this.offset)
      this.offset = 0
    }
    return item
  }

  // returns item at front of queue
  peek() {
    return (this.queue.length > 0 ? this.queue[this.offset] : undefined)
  }
}
module.exports = Queue