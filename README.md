## Forked repo

!!! Fork from original https://github.com/olofd/react-native-photos-framework repo

## Warning

In latest **IOS** versions _(13.4+)_ the library acts strange if `@react-native-community/cameraroll` is linked

Use at your own risk!

**Works on**

RN 0.60+

**Updated instructions:**

`npm i --save rn-photos-framework`

Automatic:

`react-native link rn-photos-framework` and remove Android linking afterwards

Manual:
Add to your Podfile in ios/Podfile:

`pod 'rn-photos-framework', :path => '../node_modules/rn-photos-framework'`

**Import**

`import RNPhotosFramework from 'rn-photos-framework';`

**Original documentation and examples:**
[Guide](./docs/HowToUse.md)

**PR's are welcome**
