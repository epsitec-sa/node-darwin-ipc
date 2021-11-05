/*global describe,it*/

const assert = require("assert");
const lib = require("../");
const synchronize = require("node-windows-synchronize");

describe("CreateSharedMemory", function () {
  it("should create shared memory", function () {
    const handle = lib.createSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );

    assert.ok(handle);

    lib.closeSharedMemory(handle);
  });
});

describe("OpenSharedMemory", function () {
  it("should create and open shared memory", function () {
    const cHandle = lib.createSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );
    const oHandle = lib.openSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});

describe("WriteSharedMemory", function () {
  it("should create and write into shared memory", function () {
    const handle = lib.createSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
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
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );
    const oHandle = lib.openSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.writeSharedData(cHandle, "hello world!!");
    const text = lib.readSharedData(oHandle, "utf8");

    assert.strictEqual("hello world!!", text);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});

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

describe("MarshalHwnd", function () {
  it("should convert to a hwnd a string handle and reconvert again", function () {
    const origHandle = "0x21892";

    const hwnd = lib.stringToHwnd(origHandle);
    const finalHandle = lib.hwndToString(hwnd);

    assert.strictEqual(finalHandle, origHandle);
  });
});

describe("SendCopyDataMessageTimeout", function () {
  it("should send a WM_COPYDATA message", function () {
    const targetHandle = lib.stringToHwnd("0x21892");
    const senderHandle = lib.stringToHwnd("0x0");

    assert.ok(targetHandle);
    assert.ok(senderHandle);

    lib.sendCopyDataMessageTimeout(
      targetHandle,
      senderHandle,
      "hello world",
      "utf16",
      null,
      5000
    );
  });
});

describe("CreateCopyDataListener", function () {
  it("should create a WM_COPYDATA listener", function (done) {
    const senderHandle = lib.stringToHwnd("0x0");
    const msgToSend = "aiuéoäàà";
    let rcvMsg = "";

    const res = lib.createCopyDataListener((msg) => {
      rcvMsg = msg;
    });

    assert.ok(res.dataListener);
    assert.notStrictEqual(res.listenerHwnd, "0x0");

    const targetHandle = lib.stringToHwnd(res.listenerHwnd);

    lib.sendCopyDataMessageTimeout(
      targetHandle,
      senderHandle,
      msgToSend,
      "utf8",
      null,
      500
    );

    setTimeout(() => {
      lib.disposeCopyDataListener(res.dataListener);

      done(
        rcvMsg !== msgToSend
          ? new Error(`Expected ${msgToSend}, received ${rcvMsg}`)
          : null
      );
    }, 1000);
  });
});
