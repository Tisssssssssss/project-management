import AppKit
let size=1024
let image=NSImage(size:NSSize(width:size,height:size))
image.lockFocus()
NSColor(calibratedRed:0.16,green:0.18,blue:0.19,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:64,y:64,width:896,height:896),xRadius:230,yRadius:230).fill()
NSColor(calibratedRed:0.96,green:0.95,blue:0.93,alpha:1).setFill()
let ink=NSBezierPath();ink.move(to:NSPoint(x:270,y:360));ink.curve(to:NSPoint(x:760,y:690),controlPoint1:NSPoint(x:350,y:590),controlPoint2:NSPoint(x:500,y:705));ink.curve(to:NSPoint(x:445,y:425),controlPoint1:NSPoint(x:630,y:625),controlPoint2:NSPoint(x:500,y:515));ink.curve(to:NSPoint(x:770,y:490),controlPoint1:NSPoint(x:560,y:490),controlPoint2:NSPoint(x:660,y:510));ink.curve(to:NSPoint(x:480,y:310),controlPoint1:NSPoint(x:670,y:455),controlPoint2:NSPoint(x:570,y:385));ink.curve(to:NSPoint(x:270,y:360),controlPoint1:NSPoint(x:380,y:230),controlPoint2:NSPoint(x:300,y:250));ink.close();ink.fill()
NSColor(calibratedRed:0.70,green:0.42,blue:0.32,alpha:1).setFill();NSBezierPath(ovalIn:NSRect(x:728,y:705,width:56,height:56)).fill()
image.unlockFocus()
let bitmap=NSBitmapImageRep(data:image.tiffRepresentation!)!
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
