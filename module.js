const sharedMemoryAddon = require("./build/Release/sharedMemory");
const messagingAddon = require("./build/Release/messaging");

const sharedMemoryNameMaxLength = 32;
const machMessageMaxContentLength = 4096;
const machSendTimedout = 0x10000004;
const machReceiveTimedout = 0x10004003;

function isBuffer(value) {
  return (
    value &&
    value.buffer instanceof ArrayBuffer &&
    value.byteLength !== undefined
  );
}

function strEncodeUTF16(str) {
  var buf = new ArrayBuffer(str.length * 2);
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

function bufferFromData(data, encoding) {
  if (isBuffer(data)) {
    return data;
  } else if (data && typeof data === "string") {
    if (encoding === "utf16") {
      return strEncodeUTF16(data);
    } else {
      return Buffer.from(data, encoding || "utf8");
    }
  }

  return Buffer.from(data);
}

// shared memory
function createSharedMemory(name, fileMode, memorySize) {
  if (name.length > sharedMemoryNameMaxLength) {
    throw `shared memory name length cannot be greater than ${sharedMemoryNameMaxLength}`;
  }

  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.CreateSharedMemory(
    name,
    fileMode,
    memorySize,
    handle
  );

  if (res !== 0) {
    throw `could not create shared memory ${name}: ${res}`;
  }

  return handle;
}

function openSharedMemory(name, memorySize) {
  if (name.length > sharedMemoryNameMaxLength) {
    throw `shared memory name length cannot be greater than ${sharedMemoryNameMaxLength}`;
  }

  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.OpenSharedMemory(name, memorySize, handle);

  if (res !== 0) {
    throw `could not open shared memory ${name}: ${res}`;
  }

  return handle;
}

function writeSharedData(handle, data, encoding) {
  const buf = bufferFromData(data, encoding);
  const res = sharedMemoryAddon.WriteSharedData(handle, buf, buf.byteLength);

  if (res === -1) {
    throw `data size (${data.length()}) exceeded maximum shared memory size`;
  }
}

function readSharedData(handle, encoding, bufferSize) {
  const dataSize = bufferSize || sharedMemoryAddon.GetSharedMemorySize(handle);
  const buf = Buffer.alloc(dataSize);

  const res = sharedMemoryAddon.ReadSharedData(handle, buf, dataSize);

  if (res === -1) {
    throw `data size (${data.length()}) exceeded maximum shared memory size`;
  }

  if (encoding) {
    // is a string
    return buf.toString(encoding).replace(/\0/g, ""); // remove trailing \0 characters
  }

  return buf;
}

function closeSharedMemory(handle) {
  sharedMemoryAddon.CloseSharedMemory(handle);
}

// messaging
function initializeMachPortSender(bootstrapPortName) {
  const handle = Buffer.alloc(messagingAddon.sizeof_MachPortHandle);
  const res = messagingAddon.InitializeMachPortSender(
    bootstrapPortName,
    handle
  );

  if (res !== 0) {
    throw `could not initialize mach port sender ${bootstrapPortName}: ${res}`;
  }

  return handle;
}

function initializeMachPortReceiver(bootstrapPortName) {
  const handle = Buffer.alloc(messagingAddon.sizeof_MachPortHandle);
  const res = messagingAddon.InitializeMachPortReceiver(
    bootstrapPortName,
    handle
  );

  if (res !== 0) {
    throw `could not initialize mach port receiver ${bootstrapPortName}: ${res}`;
  }

  return handle;
}

function sendMachPortMessage(handle, msgType, data, encoding, timeout) {
  const buf = bufferFromData(data, encoding);
  const res = messagingAddon.SendMachPortMessage(
    handle,
    msgType,
    buf,
    buf.byteLength,
    timeout || 0
  );

  if (res === -1) {
    throw `data size (${data.length()}) exceeded maximum msg content size (${machMessageMaxContentLength})`;
  } else if (res === machSendTimedout) {
    throw "timeout";
  } else if (res !== 0) {
    throw `could not send mach port message: ${res}`;
  }
}

function waitMachPortMessage(handle, encoding, timeout) {
  const buf = Buffer.alloc(machMessageMaxContentLength);
  const msgTypeHandle = Buffer.alloc(messagingAddon.sizeof_MsgTypeHandle);

  const res = messagingAddon.WaitMachPortMessage(
    handle,
    msgTypeHandle,
    buf,
    machMessageMaxContentLength,
    timeout || 0
  );

  if (res === -1) {
    throw `data buffer size is less than maximum content size (${machMessageMaxContentLength})`;
  } else if (res === machReceiveTimedout) {
    throw "timeout";
  } else if (res !== 0) {
    throw `could not wait mach port message: ${res}`;
  }

  return {
    msgType: msgTypeHandle[0].valueOf(),
    content: encoding
      ? buf.toString(encoding).replace(/\0/g, "") // is a string, remove trailing \0 characters
      : buf,
  };
}

function closeMachPort(handle) {
  const res = messagingAddon.CloseMachPort(handle);

  if (res !== 0) {
    throw `could not close mach port: ${res}`;
  }
}

module.exports = {
  createSharedMemory,
  openSharedMemory,
  writeSharedData,
  readSharedData,
  closeSharedMemory,

  initializeMachPortSender,
  initializeMachPortReceiver,
  sendMachPortMessage,
  waitMachPortMessage,
  closeMachPort,

  sharedMemoryFileMode: {
    S_IRWXU: 0000700 /* [XSI] RWX mask for owner */,
    S_IRUSR: 0000400 /* [XSI] R for owner */,
    S_IWUSR: 0000200 /* [XSI] W for owner */,
    S_IXUSR: 0000100 /* [XSI] X for owner */,

    /* Read, write, execute/search by group */
    S_IRWXG: 0000070 /* [XSI] RWX mask for group */,
    S_IRGRP: 0000040 /* [XSI] R for group */,
    S_IWGRP: 0000020 /* [XSI] W for group */,
    S_IXGRP: 0000010 /* [XSI] X for group */,

    /* Read, write, execute/search by others */
    S_IRWXO: 0000007 /* [XSI] RWX mask for other */,
    S_IROTH: 0000004 /* [XSI] R for other */,
    S_IWOTH: 0000002 /* [XSI] W for other */,
    S_IXOTH: 0000001 /* [XSI] X for other */,

    S_ISUID: 0004000 /* [XSI] set user id on execution */,
    S_ISGID: 0002000 /* [XSI] set group id on execution */,
    S_ISVTX: 0001000 /* [XSI] directory restrcted delete */,
  },
};
