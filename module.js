const sharedMemoryAddon = require("./build/Release/sharedMemory");

const sharedMemoryNameMaxLength = 32;

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
function createSharedMemory(
  name,
  flags,
  fileMode,
  memorySize
) {
  if (name.length > sharedMemoryNameMaxLength) {
    throw `shared memory name length cannot be greater than ${sharedMemoryNameMaxLength}`;
  }

  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.CreateSharedMemory(
    name,
    flags,
    fileMode,
    memorySize,
    handle
  );

  if (res > 0) {
    throw `could not create file mapping for object ${name}: ${res}`;
  } else if (res < 0) {
    throw `could not map view of file ${name}: ${0 - res}`;
  }

  return handle;
}

function openSharedMemory(name, flags, fileMode, memorySize) {
  if (name.length > sharedMemoryNameMaxLength) {
    throw `shared memory name length cannot be greater than ${sharedMemoryNameMaxLength}`;
  }

  const handle = Buffer.alloc(sharedMemoryAddon.sizeof_SharedMemoryHandle);

  const res = sharedMemoryAddon.OpenSharedMemory(
    name,
    flags,
    fileMode,
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
  }
};
