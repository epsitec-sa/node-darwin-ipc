#include <node_api.h>
#include <napi-macros.h>

#include <stdio.h>

#include <mach/mach.h>
#include <servers/bootstrap.h>

#define MACH_MESSAGE_CONTENT_LENGTH 4096

typedef struct mach_message_send
{
  mach_msg_header_t header;
  int msgType;
  char content[MACH_MESSAGE_CONTENT_LENGTH];
} mach_message_send;

typedef struct mach_message_receive
{
  mach_msg_header_t header;
  int msgType;
  char content[MACH_MESSAGE_CONTENT_LENGTH];
  mach_msg_trailer_t trailer;
} mach_message_receive;

// string bootstrapPortName -> int
NAPI_METHOD(InitializeMachPortSender)
{
  NAPI_ARGV(1)

  NAPI_ARGV_UTF8(bootstrapPortName, 1000, 0)

  // Lookup the receiver port using the bootstrap server.
  mach_port_t port;
  kern_return_t kr = bootstrap_look_up(bootstrap_port, bootstrapPortName, &port);
  if (kr != KERN_SUCCESS)
  {
    printf("bootstrap_look_up() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(-1)
  }

  NAPI_RETURN_INT32(port)
}

// string bootstrapPortName -> int
NAPI_METHOD(InitializeMachPortReceiver)
{
  NAPI_ARGV(1)

  NAPI_ARGV_UTF8(bootstrapPortName, 1000, 0)

  // Create a new port.
  mach_port_t port;
  kern_return_t kr = mach_port_allocate(mach_task_self(), MACH_PORT_RIGHT_RECEIVE, &port);
  if (kr != KERN_SUCCESS)
  {
    printf("mach_port_allocate() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(-1)
  }
  printf("mach_port_allocate() created port with name %d\n", port);

  // Give us a send right to this port, in addition to the receive right.
  kr = mach_port_insert_right(mach_task_self(), port, port, MACH_MSG_TYPE_MAKE_SEND);
  if (kr != KERN_SUCCESS)
  {
    printf("mach_port_insert_right() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(-2)
  }
  printf("mach_port_insert_right() inserted a send right\n");

  // Send the send right to the bootstrap server, so that it can be looked up by other processes.
  kr = bootstrap_register(bootstrap_port, bootstrapPortName, port);
  if (kr != KERN_SUCCESS)
  {
    printf("bootstrap_register() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(-3)
  }
  printf("bootstrap_register()'ed our port\n");

  NAPI_RETURN_INT32(port)
}

// long machPort, int msgType, const char* content -> int
NAPI_METHOD(SendMachPortMessage)
{
  NAPI_ARGV(3)

  NAPI_ARGV_INT32(machPort, 0)
  NAPI_ARGV_INT32(msgType, 1)
  NAPI_ARGV_BUFFER_CAST(const char *, content, 2)

  mach_message_send message;

  size_t contentLength = strnlen(content, MACH_MESSAGE_CONTENT_LENGTH);
  if (contentLength > MACH_MESSAGE_CONTENT_LENGTH)
  {
    printf("the message length if greater than %d\n", MACH_MESSAGE_CONTENT_LENGTH);
    NAPI_RETURN_INT32(1)
  }

  message.header.msgh_bits = MACH_MSGH_BITS(MACH_MSG_TYPE_COPY_SEND, 0);
  message.header.msgh_remote_port = (mach_port_t)machPort;
  message.header.msgh_local_port = MACH_PORT_NULL;

  message.msgType = msgType;
  strcpy(message.content, content);

  // Send the message.
  kern_return_t kr = mach_msg(
      &message.header, // Same as (mach_msg_header_t *) &message.
      MACH_SEND_MSG,   // Options. We're sending a message.
      sizeof(message), // Size of the message being sent.
      0,               // Size of the buffer for receiving.
      MACH_PORT_NULL,  // A port to receive a message on, if receiving.
      MACH_MSG_TIMEOUT_NONE,
      MACH_PORT_NULL // Port for the kernel to send notifications about this message to.
  );
  if (kr != KERN_SUCCESS)
  {
    printf("mach_msg() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(2)
  }

  NAPI_RETURN_INT32(0)
}

// long machPort, int* msgType, char* msgBuffer, int msgBufferLength -> int
NAPI_METHOD(WaitMachPortMessage)
{
  NAPI_ARGV(4)

  NAPI_ARGV_INT32(machPort, 0)
  NAPI_ARGV_BUFFER_CAST(int *, msgType, 1)
  NAPI_ARGV_BUFFER_CAST(char *, msgBuffer, 2)
  NAPI_ARGV_INT32(msgBufferLength, 3)
  mach_message_receive message;

  if (msgBufferLength < MACH_MESSAGE_CONTENT_LENGTH)
  {
    printf("the receive buffer length if less than %d\n", MACH_MESSAGE_CONTENT_LENGTH);
    NAPI_RETURN_INT32(1)
  }

  kern_return_t kr = mach_msg(
      &message.header,       // Same as (mach_msg_header_t *) &message.
      MACH_RCV_MSG,          // Options. We're receiving a message.
      0,                     // Size of the message being sent, if sending.
      sizeof(message),       // Size of the buffer for receiving.
      (mach_port_t)machPort, // The port to receive a message on.
      MACH_MSG_TIMEOUT_NONE,
      MACH_PORT_NULL // Port for the kernel to send notifications about this message to.
  );
  if (kr != KERN_SUCCESS)
  {
    printf("mach_msg() failed with code 0x%x\n", kr);
    NAPI_RETURN_INT32(2)
  }

  strncpy(msgBuffer, message.content, MACH_MESSAGE_CONTENT_LENGTH);
  *msgType = message.msgType;

  NAPI_RETURN_INT32(0)
}

NAPI_INIT()
{
  NAPI_EXPORT_FUNCTION(InitializeMachPortSender)
  NAPI_EXPORT_FUNCTION(InitializeMachPortReceiver)
  NAPI_EXPORT_FUNCTION(SendMachPortMessage)
  NAPI_EXPORT_FUNCTION(WaitMachPortMessage)
}