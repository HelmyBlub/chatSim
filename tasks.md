Tasks:
- need a new job so food market become usefull
    - job: house construction
        - buys wood, if has no wood
        - build houses
            - if house.length < citizen.length * 1.2
        - rent or sells houses
        - if a citizen wants to order a new house
    - job: house market
        - if citizen wants to rent or buy a house, he goes here first
    - citizen:
        - want a house
            - to store stuff
            - to rest and sleep well
                - boost performance. 
                    - move faster ? 
- what happens with houses of deceased citizens?
- houses break down over time
- make simple images
- job "food market"
    - if many mushrooms on stock, buy them for less
    - if low on mushrooms, sell for more
    - can eat their own mushrooms
- job "food gatherer"
    - try to sell for highest price
- chatter can fix their prices?
- citizen can decide to go buy mushrooms from food market
- streamer can set limits which citizen are not allowed to break
    - only allowed to break if they flag themselfes as criminal
- chatter blacklist?, way to remove unwanted chatters like bots

- use images
    - citizen image with move 8 directions
        - make top view image and rotate image => than just need some walking frames
    - hungry citizen visualized
    - starving citizen visualization
    - mushroom image


Tasks done today:
- job: wood market
- job: lumberjack
    - cut down trees for wood
    - sell wood to wood market
    - skill: gathering => more wood per tree
- refactor job code
- job "food gatherer"
    - if reach max carry, sell to food seller
- job "food market"
    - add money
    - buys mushrooms from gatherer for 1$, sells mushrooms for 2$ to hungry customer
    - if many mushrooms on stock, buy them for less
- store chatter names in localStorage, but not test names, use them
- job "food gatherer"
    - gathers mushrooms all the time
    - can carry up to 10 mushrooms
    - i can eat my own mushrooms
    - job skill. The more food i gather, the more i gain. so 0%skill 1Munshroom per pickup. 100% skill 2Mushrooms per pickup
        - skill double efficiency
        - skill increases with every pickup


Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            start steps/MVP:
                - when new chatter writes something in chat -> add chatter as citizen to world
                    - starts with no house/food, getInitial money.Total game money limited by this?
                    - automatically search for starting job:
                        - first two jobs are for food and wood
                - automatically decides to get food if low on food
                    - if market has food -> buy it with money
                        - if no money and job-> steal food?
                    - if no food and no job -> get job for creating food like farmer
                - automatically decides to get house if no house
                    - if no house to rent available -> get job to build houses
                    - if house avaiable -> rent it
            big vision:
                - each chatter becomes a citizen of a game world
                    - moves mostly by itself but chatter can influence his citizen
                    - can die, or become successful and rich
                - i as a streamer am the god. Can set rules. 
                    - i make money from taxes. I can build stuff with my money or spend on goverment jobs
                        - income tax
                        - other taxes
                    - i can set taxes. Based on tax income i can set who gets what amount of money.
                        - teachers/schools -> research, more efficient workers
                        - police  -> to few -> more stealing/destroying
                        - firefighers -> to few -> fires might destroy houses more
                        - "health care" -> no health care -> poor people will die
                                - citizen ganes stats for everything he does. Dying meas stats are lost. 
                    - like citybuilder games: mark housing areas, shopping areas. Otherwise inhabitant will build where they want, could be bad if city grows big
                    - set area for forest replanting, so enough wood is available long term
                    - to have police i need to set taxes. Based on tax income i can employ x number of police
                        - if crime is to big, my police might not be enough. if low crime i can save on police money
                - as a chatter i can choose my "job"
                    - criminal -> steal stuff, destroy stuff
                    - police -> fight criminals
                    - medic -> heal injured
                    - farmer -> plant food
                    - go on strike -> stops working
                        - put up strike message
                - simulate resouces: the more workers gather wood, the more wood, prices for wood go down
                    - resourse have to be transported
                - game should simulate some society
                - society should work with 1 or 1000 inhabitant/chatter
                - should progress through ages/technologies
                - world starts with trees and stones and some type of forest food
                - inhabitants build town own their own
                    - cut down trees for wood -> build wood house with it
                    - gather fruits/meats for food
                    - each inhabitant can have job


