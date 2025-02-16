const express = require("express");
const bodyparser = require("body-parser");
const https = require("https");
app = express();
app.use(express.urlencoded({ extended: true })); //Makes form data accessible via req.body.
app.get("/",function(req,res){
    res.sendFile(__dirname+"/public/home.html");
});
app.get("/details",function(req,res){
    const val = req.query.value;
    console.log(val);
    res.sendFile(__dirname+"/public/details.html");
});
app.post("/details", (req, res) => {
    const type = req.body.value;
    console.log(type);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const a = req.body.address;
    const r = req.body.radius;
    const mykey = "4b5bc48ab4ab4bb1aa76d86232668660";
    const url1 = `https://api.geoapify.com/v1/geocode/search?text=${a}&limit=1&apiKey=${mykey}`;

    https.get(url1, (response) => {
        let data = "";
// sometimes emits data is emitted in chunks, meaning the data might not arrive as a complete JSON object in one event

        response.on("data", (chunk) => {
            data += chunk;
        });

        response.on("end", () => {
            try {
                const locationData = JSON.parse(data);
//Without optional chaining(?), trying to access a property of undefined or null will throw a runtime error:
                const lat = locationData.features[0]?.geometry?.coordinates[1];
                const lon = locationData.features[0]?.geometry?.coordinates[0];

                if (!lat || !lon) {
                    res.write("Could not fetch latitude and longitude.");
                    return res.end();
                }
                console.log(`${lat},${lon}`)
                // Second API call using the latitude and longitude
                const url2 = `https://api.geoapify.com/v2/places?categories=accommodation.${type}&filter=circle:${lon},${lat},${r}&limit=20&apiKey=${mykey}`;
                https.get(url2, (response2) => {
                    let data2 = "";

                    response2.on("data", (chunk) => {
                        data2 += chunk;
                    });

                    response2.on("end", () => {
                        try {
                            const detailsData = JSON.parse(data2);
                            let arr = detailsData.features;
                            const len = arr.length;
                            console.log(len);
                            for(let i = 0;i<len;i++){
                                if (detailsData.features[i].properties.name){
                                res.write(Buffer.from(detailsData.features[i]?.properties?.name,'utf-8') + "\n");
                                res.write(Buffer.from(detailsData.features[i]?.properties?.formatted,'utf-8') + "\n"+"\n");
                                }
                            }
                            
                            //we cant write json format so converting it to string
                            // res.write(`Details: ${JSON.stringify(detailsData)}`);
                            res.end();
                        } catch (error) {
                            console.log(error);
                            res.write("Error parsing second API response.");
                            res.end();
                        }
                    });

                    response2.on("error", (error) => {
                        res.write(`Error with second API call: ${error.message}`);
                        res.end();
                    });
                });
            } catch (error) {
                res.write("Error parsing first API response.");
                res.end();
            }
        });

        response.on("error", (error) => {
            res.write(`Error with first API call: ${error.message}`);
            res.end();
        });
    });
});
app.listen(2000,function(req,res){
    console.log("port running in 2000");
});