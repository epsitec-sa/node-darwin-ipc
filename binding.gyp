{
  "targets": [
    {
      "target_name": "sharedMemory",
      "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
      ],
      "sources": [ "./src/sharedMemory.cpp" ],
      "libraries": [],
    },
    {
      "target_name": "messaging",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "include_dirs": [
          "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "sources": [ "./src/messaging.cpp", "./src/wipc/Module.cpp", "./src/wipc/Window.cpp", "./src/wipc/WipcUtf8Listener.cpp" ],
      "libraries": [],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
    }
  ]
}