const sharedMemoryAddon = require("./build/Release/sharedMemory");
const messagingAddon = require("bindings")("messaging.node");

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

const sendMessageTimeoutFlags = {
  SMTO_NORMAL: 0x00,
  SMTO_BLOCK: 0x01,
  SMTO_ABORTIFHUNG: 0x02,
  SMTO_NOTIMEOUTIFNOTHUNG: 0x08,
  SMTO_ERRORONEXIT: 0x20, // WARNING: this flag is only available on Windows Vista and higher. If you use it on Windows XP SP3 or older, SendMessageTimeout will return ERROR_INVALID_PARAMETER.
};

// shared memory
function createSharedMemory(
  name,
  pageAccess,
  fileMapAccess,
  memorySize,
  sddlString
) {
  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.CreateSharedMemory(
    name,
    pageAccess,
    fileMapAccess,
    memorySize,
    sddlString || "",
    handle
  );

  if (res > 0) {
    throw `could not create file mapping for object ${name}: ${res}`;
  } else if (res < 0) {
    throw `could not map view of file ${name}: ${0 - res}`;
  }

  return handle;
}

function openSharedMemory(name, fileMapAccess, memorySize) {
  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.OpenSharedMemory(
    name,
    fileMapAccess,
    memorySize,
    handle
  );

  if (res > 0) {
    throw `could not open file mapping for object ${name}: ${res}`;
  } else if (res < 0) {
    throw `could not map view of file ${name}: ${0 - res}`;
  }

  return handle;
}

function writeSharedData(handle, data, encoding) {
  const buf = bufferFromData(data, encoding);
  const res = sharedMemoryAddon.WriteSharedData(handle, buf, buf.byteLength);

  if (res === 1) {
    throw `data size (${data.length()}) exceeded maximum shared memory size`;
  }
}

function readSharedData(handle, encoding, bufferSize) {
  const dataSize = bufferSize || sharedMemoryAddon.GetSharedMemorySize(handle);
  const buf = Buffer.alloc(dataSize);

  const res = sharedMemoryAddon.ReadSharedData(handle, buf, dataSize);

  if (res === 1) {
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

function stringToHwnd(strHwnd) {
  const handle = Buffer.alloc(messagingAddon.sizeof_WindowHandle);

  const res = messagingAddon.StringToHwnd(strHwnd, handle);

  if (res > 0) {
    throw `could not convert string ${strHwnd} to hwnd: ${res}`;
  }

  return handle;
}

function hwndToString(hwnd) {
  const hwndVal = messagingAddon.HwndToUint(hwnd);

  return `0x${hwndVal.toString(16)}`;
}

function sendCopyDataMessageTimeout(
  targetHwnd,
  senderHwnd,
  data,
  encoding,
  sendMessageFlags,
  timeout
) {
  const buf = bufferFromData(data, encoding);
  const finalFlags =
    sendMessageFlags ||
    sendMessageTimeoutFlags.SMTO_NOTIMEOUTIFNOTHUNG |
      sendMessageTimeoutFlags.SMTO_ERRORONEXIT;
  const res = messagingAddon.SendCopyDataMessageTimeout(
    targetHwnd,
    senderHwnd,
    buf,
    buf.byteLength,
    finalFlags,
    timeout || 2000
  );

  if (res === 1) {
    throw `could not send WM_COPYDATA message`;
  }
}

function createCopyDataListener(onMessage) {
  const dataListener = Buffer.alloc(messagingAddon.sizeof_CopyDataListener);

  const hwnd = messagingAddon.CreateCopyDataListener(
    dataListener,
    onMessage || function () {}
  );

  if (hwnd === 0) {
    throw `could not create WM_COPYDATA listener`;
  }

  return {
    dataListener,
    listenerHwnd: `0x${hwnd.toString(16)}`,
  };
}

function disposeCopyDataListener(listener) {
  const res = messagingAddon.DisposeCopyDataListener(listener);

  if (res === 1) {
    throw `could not dispose WM_COPYDATA listener`;
  }
}

module.exports = {
  createSharedMemory,
  openSharedMemory,
  writeSharedData,
  readSharedData,
  closeSharedMemory,

  sharedMemoryPageAccess: {
    ReadOnly: 0x02,
    WriteCopy: 0x08,
    ReadWrite: 0x04,
  },
  sharedMemoryFileMapAccess: {
    Read: 0x0004,
    Write: 0x0002,
    AllAccess: 0xf001f,
  },

  stringToHwnd,
  hwndToString,

  sendCopyDataMessageTimeout,
  sendMessageTimeoutFlags,

  createCopyDataListener,
  disposeCopyDataListener,
};
