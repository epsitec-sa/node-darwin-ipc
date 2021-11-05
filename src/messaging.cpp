#define NAPI_VERSION 4

#include <napi.h>

#include <windows.h>
#include <string>
#include "./wipc/WipcUtf8Listener.h"

struct WindowHandle
{
  HWND hwnd;
};

struct CopyDataListener
{
  Epsitec::Wipc::WipcUtf8Listener* listener;
  Napi::ThreadSafeFunction tsfn;
};

void OnMessageCallback(Napi::Env env, Napi::Function jsCallback, LPCSTR message) 
{
  // Transform native data into JS data, passing it to the provided
  // `jsCallback` -- the TSFN's JavaScript function.
  jsCallback.Call( {Napi::String::New(env, message )} );

  // We're finished with the data.
  delete message;
}

// string strHwnd, WindowHandle* hwnd -> int
Napi::Value StringToHwnd(const Napi::CallbackInfo& info) 
{
  Napi::Env env = info.Env();

  if (info.Length() != 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsString() || !info[1].IsBuffer()) {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string s = info[0].As<Napi::String>().Utf8Value();
  struct WindowHandle * hwnd = (struct WindowHandle *)info[1].As<Napi::Buffer<uint8_t>>().Data();

  hwnd->hwnd = (HWND)std::stoul(s, nullptr, 16);

  return env.Null();
}

// WindowHandle* hwnd -> uint32
Napi::Value HwndToUint(const Napi::CallbackInfo& info) 
{
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct WindowHandle * hwnd = (struct WindowHandle *)info[0].As<Napi::Buffer<uint8_t>>().Data();

  return Napi::Number::New(env, (UINT32)hwnd->hwnd);
}

// *WindowHandle targetHwnd, *WindowHandle senderHwnd, byte* data, int dataSize, int sendMessageTimeoutFlags, int timeout -> int
Napi::Value SendCopyDataMessageTimeout(const Napi::CallbackInfo& info)
{
  int result = 0;
  Napi::Env env = info.Env();

  if (info.Length() != 6) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer() ||
      !info[3].IsNumber() || !info[4].IsNumber() || !info[5].IsNumber()) {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct WindowHandle * targetHwnd = (struct WindowHandle *)info[0].As<Napi::Buffer<uint8_t>>().Data();
  struct WindowHandle * senderHwnd = (struct WindowHandle *)info[1].As<Napi::Buffer<uint8_t>>().Data();
  char * data = info[2].As<Napi::Buffer<char>>().Data();
  int dataSize = info[3].As<Napi::Number>().Int32Value();
  int sendMessageTimeoutFlags = info[4].As<Napi::Number>().Int32Value();
  int timeout = info[5].As<Napi::Number>().Int32Value();

  COPYDATASTRUCT cds;
  cds.dwData = 0;
  cds.cbData = dataSize;
  cds.lpData = data;

  auto res = SendMessageTimeoutA(targetHwnd->hwnd, WM_COPYDATA, (WPARAM)senderHwnd->hwnd, (LPARAM)(LPVOID)&cds, sendMessageTimeoutFlags, timeout, NULL);
  if (res == 0)
  {
    result = 1;
  }

  return Napi::Number::New(env, result);
}

// *CopyDataListener dataListener -> uint
Napi::Value CreateCopyDataListener(const Napi::CallbackInfo& info)
{
  unsigned int result = 0;
  Napi::Env env = info.Env();

  if (info.Length() != 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsBuffer() || !info[1].IsFunction()) {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct CopyDataListener * dataListener = (struct CopyDataListener *)info[0].As<Napi::Buffer<uint8_t>>().Data();

  // Create a ThreadSafeFunction
  auto tsfn = Napi::ThreadSafeFunction::New(
    env,
    info[1].As<Napi::Function>(),
    "OnMessage",             // Name
    0,                       // Unlimited queue
    1,                       // Only one thread will use this initially
    []( Napi::Env ) {}       // Finalizer used to clean threads up
  );

  auto onMessage = [&, tsfn](HWND sender, LPCSTR message)
  {
    size_t len = strlen(message);
    char* char_str = new char[len + 1];
    strncpy(char_str, message, len);
    char_str[len] = '\0';

    return tsfn.BlockingCall( char_str, OnMessageCallback ) == napi_ok;
  };

  dataListener->tsfn = tsfn;
	dataListener->listener = new Epsitec::Wipc::WipcUtf8Listener(onMessage);

  result = (UINT32)dataListener->listener->Handle();

  return Napi::Number::New(env, result);
}

// *CopyDataListener dataListener -> int
Napi::Value DisposeCopyDataListener(const Napi::CallbackInfo& info)
{
  int result = 0;
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  struct CopyDataListener * dataListener = (struct CopyDataListener *)info[0].As<Napi::Buffer<uint8_t>>().Data();

  dataListener->tsfn.Abort();
  delete dataListener->listener;
  dataListener->tsfn.Release();

  return Napi::Number::New(env, result);
}


Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "StringToHwnd"), Napi::Function::New(env, StringToHwnd));
  exports.Set(Napi::String::New(env, "HwndToUint"), Napi::Function::New(env, HwndToUint));

  exports.Set(Napi::String::New(env, "SendCopyDataMessageTimeout"), Napi::Function::New(env, SendCopyDataMessageTimeout));

  exports.Set(Napi::String::New(env, "CreateCopyDataListener"), Napi::Function::New(env, CreateCopyDataListener));
  exports.Set(Napi::String::New(env, "DisposeCopyDataListener"), Napi::Function::New(env, DisposeCopyDataListener));

  exports.Set(Napi::String::New(env, "sizeof_WindowHandle"), Napi::Number::New(env, sizeof(struct WindowHandle)));
  exports.Set(Napi::String::New(env, "sizeof_CopyDataListener"), Napi::Number::New(env, sizeof(struct CopyDataListener)));

  return exports;
}

NODE_API_MODULE(addon, Init)