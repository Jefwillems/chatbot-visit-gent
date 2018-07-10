//Router for API
const router = require('express').Router();
const mw = require('../../util/middleware');

//Models for messenger
const Card = require('../../models/card');
const Button = require('../../models/button');
const CardButton = require('../../models/card_button');
const QuickReply = require('../../models/quickReply');
const generate_navigate_button = require('../../models/navigate_button');

//Location mappers
const LocationMapper = require('../../util/locationmapper');
const location = require('../../util/location');
const locationMapper = new LocationMapper();

//Utils
const util = require("../../util/util");

//Database managers
const cosmosDB = require("../../db/cosmosDB/cosmosDBManager");

//Date conversions
const moment = require('moment');

// General images of Gentse Feesten
const images = [
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/1.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/2.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/3.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/4.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/5.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/6.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/7.jpg',
    'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/gentsefeesten/8.jpg'
];

//Intent actions
router.all('/', mw.typeMiddleware, (req, res, next) => {
    let fn;
    switch (req.type) {
        case 'get_plein_location':
            fn = getClosestStage;
            break;
        case 'get_events':
            fn = getEventsSquareForDate;
            break;
        case 'all_squares':
            fn = getAllSquares;
            break;
        case 'toiletten.search':
            fn = getClosestToilet;
            break;
        case 'feedback.satisfaction':
            fn = feedbackSatisfaction;
            break;
        case 'plein_card':
            fn = getSquareCard;
            break;
        case 'get_days':
            fn = getDaysGF;
            break;
        case 'get.events.now':
            fn = getEventsGFNow;
            break;
        case 'get_events_today':
            fn = getEventsForToday;
            break;
        case 'get_now':
            fn = getCurrentEventFor;
            break;
        default:
            return next(new Error(`type not defined: ${req.type}, action: ${req.body.queryResult.action}`));
    }
    return fn(req, res, next);
});

function feedbackSatisfaction(req) {
    let improvementProposal = req.body.queryResult.parameters.improvement_proposal;
    switch (req.body.queryResult.parameters.satisfaction) {
        case "tevreden":
            cosmosDB.addFeedback(1, improvementProposal);
            break;
        case "neutraal":
            cosmosDB.addFeedback(0, improvementProposal);
            break;
        case "niet tevreden":
            cosmosDB.addFeedback(-1, improvementProposal);
            break;
        default:
            break;
    }
}

function getClosestStage(req, res) {
    const {payload} = req.body.originalDetectIntentRequest;
    const {lat, long} = payload.data.postback.data;
    const squares = locationMapper.getSquares();
    const nearest = location.closestLocation({lat, long}, squares);
    const urlName = nearest.name.nl.split(' ').join('_');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${long}&destination=${nearest.lat},
                ${nearest.long}&travelmode=walking`;
    const card = new Card(
        `https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/pleinen/${urlName}.jpg`,
        `${nearest.name.nl}`,
        {
            subtitle: "Klik op één van de volgende knoppen om te navigeren of het programma te bekijken."
        },
        [
            new CardButton(`Programma`, `Programma ${nearest.name.nl}`, "postback"),
            new Button('Toon mij de weg', url, 'web_url'),
            new CardButton("Terug naar hoofdmenu", "menu", "postback")
        ],
        url
    );
    return res.json({
        payload: {
            facebook: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [card.getResponse()]
                    }
                }
            }
        }
    });
}

function getClosestToilet(req, res) {
    const {payload} = req.body.originalDetectIntentRequest;
    const {lat, long} = payload.data.postback.data;
    const nearest = location.closestLocation({lat, long}, locationMapper.getToilets());
    let url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${long}&destination=${nearest.lat},
                ${nearest.long}&travelmode=walking`;
    const card = new Card(
        'https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/toilet/toilet.jpg',
        'Dichtstbijzijnde toilet',
        {},
        [
            generate_navigate_button(url),
            new CardButton("Terug naar hoofdmenu", "menu", "postback")
        ],
        url
    );

    return res.json({
        payload: {
            facebook: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        elements: [
                            card.getResponse()
                        ]
                    }
                }
            }
        }
    });
}

function getAllSquares(req, res) {
    // We cached the squares with their locations in the locationMapper before the server started.
    const squares = locationMapper.getSquares();
    const elements = [];

    const shuffledImagesArray = util.shuffleArray(images);

    let count = 1;
    let imageCount = 0;
    while (squares.length > 0) {
        // take 3 square objects
        const three = squares.splice(0, 3);
        // construct a Card object with the 3 squares we just sampled
        const card = new Card(
            // sample a random image from the list.
            shuffledImagesArray[imageCount],
            `Pleinen ${count} - ${count + (three.length - 1)}`,
            {
                subtitle: 'Druk één van de pleinen om het programma te bekijken of om er naartoe te gaan'
            },
            // create buttons from the 3 square objects, with a google maps link to their location.
            three.map(el =>
                new CardButton(
                    el.name.nl,
                    el.name.nl,
                    "postback"
                ))
        );
        elements.push(card);
        count += 3;
        imageCount++
    }
    return res.json({
        payload: {
            facebook: {
                attachment: {
                    type: 'template',
                    payload: {
                        //"text": "Hier is een lijst van feestpleinen van de Gentse Feesten",
                        template_type: 'generic',
                        // get the json structure for the card
                        elements: elements.map(el => el.getResponse())
                    }
                }
            }
        }
    });

}

function getSquareCard(req, res) {
    const square = getSquareData(req.body.queryResult.parameters.plein);
    getEventsNow().then(function (events) {
        const squareName = square.name.nl.split('/')[0].toLowerCase();

        const eventNow = events.find(function (event) {
            if (typeof event.address !== "undefined" && event.address.toLowerCase().includes(squareName)) {
                return event
            }
        });

        const url = `https://www.google.com/maps/search/?api=1&query=${square.lat},${square.long}`;
        //Om input van gebruker af te schermen wordt square.name.nl gebruikt ipv pleinName
        const imageName = square.name.nl.split('/')[0].trim().split(' ').join('_');
        const card = new Card(
            `https://raw.githubusercontent.com/lab9k/chatbot-visit-gent/master/img/pleinen/${imageName}.jpg`,
            square.name.nl, {
                subtitle: eventNow ? "Nu: " + eventNow.eventName : "Momenteel is er niets, voor meer info druk op programma",
            }, [
                new CardButton(`Programma`, `Programma ${square.name.nl}`, "postback"),
                new CardButton("Programma nu", "Programma nu", "postback"),
                generate_navigate_button(url)
            ],
        );
        return res.json({
            payload: {
                facebook: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: [card.getResponse()]
                        }
                    }
                }
            }
        });
    })
}

function getDaysGF(req, res) {
    const today = new Date().getDate;
    const startGf = new Date("2018-07-13");
    const endGf = new Date("2018-07-22");

    const gentseFeestenDays = [];

    // If today is during Gentsefeesten then return the remaining days else show all days
    let tmpDate = startGf < today && today <= endGf ? today : startGf;

    while (tmpDate <= endGf) {
        const date = new Date(tmpDate).getDate().toString() + " Juli";
        gentseFeestenDays.push(date);
        tmpDate.setDate(tmpDate.getDate() + 1);
    }

    const quickReply = new QuickReply("Voor welke datum wil je het programma zien?", gentseFeestenDays).getResponse();

    return res.json({
        payload: {
            facebook: {
                "text": quickReply.text,
                "quick_replies": quickReply.quick_replies
            }
        }
    });
}

function getEventsGFNow(req, res) {
    getEventsNow().then(function (events) {
        if (events.length === 0) {
            const defaultMenu = ["Feestpleinen", "Toilet", "Feedback"];
            const quickReply = new QuickReply("Er zijn op dit moment geen evenementen op de Gentse Feesten" +
                ", Hoe kan ik je verder helpen?", defaultMenu).getResponse();

            return res.json({
                payload: {
                    facebook: {
                        "text": quickReply.text,
                        "quick_replies": quickReply.quick_replies
                    }
                }
            });
        }

        //list to store all cards of events
        let cardList = [];
        //console.log("list", events);

        events.forEach((event) => {
            //const square = locationMapper.getSquares().find(square => square.name.nl.toLowerCase() == event.address.toLowerCase());
            // construct a Card object for each event
            if (event.image_url == null) {
                event.image_url = "https://www.uitinvlaanderen.be/sites/default/files/styles/large/public/beeld_gf_nieuwsbericht.jpg"
            }
            if (event.eventName.length > 64) {
                event.eventName = event.eventName.substr(0, 61) + "..."
            }
            if (typeof event.description === "undefined") {
                event.description = ""
            }

            const imageUrlEncoded = encodeURI(event.image_url);
            let url = `https://www.google.com/maps`;
            const card = new Card(
                `${imageUrlEncoded}`,
                `${event.eventName} (${moment(event.startDate).add(2, 'hours').format('HH:mm')} - 
                    ${moment(event.endDate).add(2, 'hours').format('HH:mm')})`,
                {
                    subtitle: `${event.description}`
                }, [
                    new Button('Toon mij de weg', url, 'web_url'),
                    new CardButton("Terug naar hoofdmenu", "menu", "postback")
                ],
                `https://www.google.com/maps`
            );
            cardList.push(card);
        });

        return res.json({
            payload: {
                facebook: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            // get the json structure for the card
                            elements: cardList.map(el => el.getResponse())
                        }
                    }
                }
            }
        });
    })
}

function getEventsNow() {
    // Use connect method to connect to the server
    return cosmosDB.getAllEventsFromNow().exec().then(function (events, err) {
        if (err)
            console.log(err);
        return events;
    })
}

function getEvents(res, squareName, date = new Date()) {
    const square = getSquareData(squareName);

    // Use connect method to connect to the server
    cosmosDB.getEventsSelectedStageAndDate(new Date(date), squareName).exec(function (err, events) {
        if (err)
            return console.log("error", err);

        if (events.length === 0) {
            const defaultMenu = ["Feestpleinen", "Toilet", "Feedback"];
            const quickReply = new QuickReply("Er zijn geen evenementen voor dit plein voor deze datum, Hoe kan ik je verder helpen?", defaultMenu).getResponse();

            return res.json({
                payload: {
                    facebook: {
                        "text": quickReply.text,
                        "quick_replies": quickReply.quick_replies
                    }
                }
            });
        }
        //list to store all cards of events
        let cardList = [];

        //console.log("event 1:",events[0]);
        events.forEach((event) => {
            //const square = locationMapper.getSquares().find(square => square.name.nl.toLowerCase() == event.address.toLowerCase());
            // construct a Card object for each event
            if (event.image_url == null) {
                event.image_url = images[util.getRandomInt(0, images.length - 1)];
            }
            const url = `https://www.google.com/maps/search/?api=1&query=${square.lat},${square.long}`;
            const imageUrlEncoded = encodeURI(event.image_url);
            const card = new Card(
                `${imageUrlEncoded}`,
                `${event.eventName} (${moment(event.startDate).add(2, 'hours').format('H:mm')} - 
                ${moment(event.endDate).add(2, 'hours').format('H:mm')})`,
                {
                    subtitle: `${event.description}`
                }, [
                    generate_navigate_button(url),
                    new CardButton("Terug naar hoofdmenu", "menu", "postback")
                ],
                url
            );
            cardList.push(card);
        });

        return res.json({
            payload: {
                facebook: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            // get the json structure for the card
                            elements: cardList.map(el => el.getResponse())
                        }
                    }
                }
            }
        });
    });
}

function getEventsSquareForDate(req, res) {
    return getEvents(res, req.body.queryResult.parameters.square, req.body.queryResult.parameters.date);
}

function getEventsForToday(req, res) {
    return getEvents(res, req.body.queryResult.parameters.plein);
}

function getCurrentEventFor(req, res) {
    return getEvents(res, req.body.queryResult.parameters.plein);
}

function getSquareData(squareName) {
    return locationMapper.getSquares().find(square => square.name.nl.split('/')[0].trim().toLowerCase() === squareName.toLowerCase());
}

module.exports = router;
