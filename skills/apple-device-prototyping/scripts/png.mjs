import {inflateSync} from 'node:zlib';

// Static RGB/RGBA screenshots emitted by UIKit, 8- or 16-bit, noninterlaced.
// Chunk/CRC and scanline structure: https://www.w3.org/TR/png-3/
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=data=>{let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};

export function validatePNG(data,capture) {
  const fail=message=>{throw Error('Invalid PNG: '+message);};
  if(data.length<33||data.length>25*1024*1024||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')fail('signature or size');
  let offset=8,header=false,ended=false,idatEnded=false,palette=false,width,height,depth,color;
  const compressed=[];
  while(offset<data.length) {
    if(offset+12>data.length)fail('truncated chunk');
    const length=data.readUInt32BE(offset),end=offset+12+length;
    if(end>data.length)fail('truncated chunk data');
    const type=data.toString('ascii',offset+4,offset+8),bytes=data.subarray(offset+8,end-4);
    if(!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type))fail('chunk type');
    if(crc32(data.subarray(offset+4,end-4))!==data.readUInt32BE(end-4))fail('chunk CRC');
    if(!header&&type!=='IHDR')fail('missing initial IHDR');
    if(type==='IHDR') {
      if(header||length!==13)fail('IHDR');header=true;
      width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);depth=bytes[8];color=bytes[9];
      if(!width||!height||Math.abs(width-capture.viewBounds.width*capture.scale)>1||Math.abs(height-capture.viewBounds.height*capture.scale)>1)fail('dimensions disagree with capture');
      if(![8,16].includes(depth)||![2,6].includes(color)||bytes[10]!==0||bytes[11]!==0||bytes[12]!==0)fail('unsupported screenshot encoding (requires noninterlaced RGB/RGBA, 8/16 bit)');
    }else if(type==='IDAT') {
      if(idatEnded)fail('nonconsecutive IDAT');compressed.push(bytes);
    }else if(type==='IEND') {
      if(length||!compressed.length||end!==data.length)fail('IEND');ended=true;
    }else {
      if(compressed.length)idatEnded=true;
      if(type==='PLTE') {
        if(palette||compressed.length||!length||length>768||length%3)fail('PLTE');palette=true;
      }else if(type[0]===type[0].toUpperCase())fail('unknown critical chunk');
      if(['acTL','fcTL','fdAT'].includes(type))fail('animated screenshots unsupported');
    }
    offset=end;
  }
  if(!ended)fail('missing IEND');
  const rowBytes=width*(color===6?4:3)*(depth/8),expected=height*(rowBytes+1);
  if(expected>128*1024*1024)fail('decoded screenshot exceeds 128 MiB');
  const input=Buffer.concat(compressed);
  let decoded;
  try{decoded=inflateSync(input,{maxOutputLength:expected,info:true});}catch{fail('image data cannot be decompressed');}
  if(decoded.buffer.length!==expected||decoded.engine.bytesWritten!==input.length)fail('image data length');
  for(let row=0;row<height;row++)if(decoded.buffer[row*(rowBytes+1)]>4)fail('scanline filter');
}
