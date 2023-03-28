const AWS = require('aws-sdk');
const util = require('util');
const sharp = require('sharp');

// get reference to S3 client
const s3 = new AWS.S3();

export async function handler(event, context, callback) {
    let origimage;
    let buffer50;
    let buffer25;

// Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const srcBucket = event.Records[0].s3.bucket.name;
// Object key may have spaces or unicode non-ASCII characters.
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const dstBucket50 = srcBucket + "-resized50";
    const dstKey50    = "resized50-" + srcKey;
    const dstBucket25 = srcBucket + "-resized25";
    const dstKey25    = "resized25-" + srcKey;


// Infer the image type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the image type.");
        return;
    }

// Check that the image type is supported
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
        console.log(`Unsupported image type: ${imageType}`);
        return;
    }

// Download the image from the S3 source bucket.
    try {
        const params = {
            Bucket: srcBucket,
            Key: srcKey
        };
        origimage = await s3.getObject(params).promise();

    } catch (error) {
        console.log(error);
        return;
    }

// Use the sharp module to resize the image and save in a buffer50 and buffer25.
    try {
        const image = await sharp(origimage.Body);
        const imageMetadata = await image.metadata();
        const {width: imageWidth, height: imageHeight} = imageMetadata;

        buffer50 = await sharp(origimage.Body).resize({
            width: Math.round(imageWidth * 0.5),
            height: Math.round(imageHeight * 0.5)
        }).toBuffer();

        buffer25 = await sharp(origimage.Body).resize({
            width: Math.round(imageWidth * 0.25),
            height: Math.round(imageHeight * 0.25)
        }).toBuffer();
    } catch (error) {
        console.log(error);
        return;
    }

// Upload the thumbnail image to the destination bucket50
    try {
        const destparams50 = {
            Bucket: dstBucket50,
            Key: dstKey50,
            Body: buffer50,
            ContentType: "image"
        };

        await s3.putObject(destparams50).promise();
    } catch (error) {
        console.log(error);
        return;
    } finally {
        console.log('Successfully resized ' + srcBucket + '/' + srcKey +
            ' and uploaded to ' + dstBucket50 + '/' + dstKey50);
    }

    // Upload the thumbnail image to the destination bucket25
    try {
        const destparams25 = {
            Bucket: dstBucket25,
            Key: dstKey25,
            Body: buffer25,
            ContentType: "image"
        };

        await s3.putObject(destparams25).promise();
    } catch (error) {
        console.log(error);
        return;
    } finally {
        console.log('Successfully resized ' + srcBucket + '/' + srcKey +
            ' and uploaded to ' + dstBucket25 + '/' + dstKey25);
    }
}
