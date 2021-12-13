/*global describe,it*/

const assert = require("assert");
const lib = require("../");
//const synchronize = require("node-windows-synchronize");

describe("CreateSharedMemory", function () {
  it("should create shared memory", function () {
    const handle = lib.createSharedMemory(
      "/TestSharedMemory",
      lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR,
      4096
    );

    assert.ok(handle);

    lib.closeSharedMemory(handle);
  });
});

describe("OpenSharedMemory", function () {
  it("should create and open shared memory", function () {
    const cHandle = lib.createSharedMemory(
      "/TestSharedMemory",
      lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR,
      4096
    );
    const oHandle = lib.openSharedMemory("/TestSharedMemory", 4096);

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});

describe("WriteSharedMemory", function () {
  it("should create and write into shared memory", function () {
    const handle = lib.createSharedMemory(
      "/TestSharedMemory",
      lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR,
      4096
    );

    lib.writeSharedData(handle, "hello world!!");

    assert.ok(handle);

    lib.closeSharedMemory(handle);
  });
});

describe("ReadSharedMemory", function () {
  it("should create, open, write and read from shared memory", function () {
    const cHandle = lib.createSharedMemory(
      "/TestSharedMemory",
      lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR,
      4096
    );
    const oHandle = lib.openSharedMemory("/TestSharedMemory", 4096);

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.writeSharedData(cHandle, "hello wòrld!!");
    const text = lib.readSharedData(oHandle, "utf8");

    assert.strictEqual("hello wòrld!!", text);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});
/*
describe("WriteSharedMemorySerial", function () {
  it("should create and write in a serial way to shared memory", function () {
    const smHandle = lib.createSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );
    const mHandle = synchronize.createMutex("Local\\TestMutex");

    assert.ok(smHandle);
    assert.ok(mHandle);

    for (let i = 0; i < 100000; i++) {
      synchronize.waitMutex(mHandle, synchronize.waitTime.Infinite);

      lib.writeSharedData(smHandle, "hello world: " + i);

      synchronize.releaseMutex(mHandle);
    }

    const text = lib.readSharedData(smHandle, "utf8");
    assert.strictEqual("hello world: 99999", text);

    synchronize.closeMutex(mHandle);
    lib.closeSharedMemory(smHandle);
  });
});
*/

describe("CreateMachPortReceiver", function () {
  it("should create a mach port receiver", function () {
    const handle = lib.initializeMachPortReceiver("testMachPort1");

    assert.ok(handle);

    lib.closeMachPort(handle);
  });
});

describe("CreateMachPortSenderAndReceiver", function () {
  it("should create a mach port sender and receiver", function () {
    const rHandle = lib.initializeMachPortReceiver("testMachPort2");
    const sHandle = lib.initializeMachPortSender("testMachPort2");

    assert.ok(rHandle);
    assert.ok(sHandle);

    lib.closeSharedMemory(sHandle);
    lib.closeSharedMemory(rHandle);
  });
});

describe("SendMachPortMessage", function () {
  it("should send message through mach port", function () {
    const rHandle = lib.initializeMachPortReceiver("testMachPort3");
    const sHandle = lib.initializeMachPortSender("testMachPort3");

    assert.ok(rHandle);
    assert.ok(sHandle);

    lib.sendMachPortMessage(sHandle, 1, "hello world");

    lib.closeSharedMemory(sHandle);
    lib.closeSharedMemory(rHandle);
  });
});

describe("SendAndReceivedMachPortMessage", function () {
  it("should send and received message through mach port", function () {
    const rHandle = lib.initializeMachPortReceiver("testMachPort4");
    const sHandle = lib.initializeMachPortSender("testMachPort4");

    assert.ok(rHandle);
    assert.ok(sHandle);

    lib.sendMachPortMessage(sHandle, 1, "hello wòrld!!");
    const msg = lib.waitMachPortMessage(rHandle, "utf8");

    assert.strictEqual(1, msg.msgType);
    assert.strictEqual("hello wòrld!!", msg.content);

    lib.closeSharedMemory(sHandle);
    lib.closeSharedMemory(rHandle);
  });
});

describe("ReceivedMachPortMessageTimeout", function () {
  it("should wait for message and throw timeout", function () {
    const rHandle = lib.initializeMachPortReceiver("testMachPort5");

    assert.ok(rHandle);

    assert.throws(
      () => lib.waitMachPortMessage(rHandle, "utf8", 500),
      /timeout/
    );

    lib.closeSharedMemory(rHandle);
  });
});
