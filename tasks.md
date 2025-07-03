Tasks:
- obs chat overlay
    - change how messages are checked
        - lowercase
        - find words in whole message
        - allow spelling errors
        - similar to how i checked for bots
    - viewer request: emote "pewpewpew"

- citizens walking backwards? why? certain angles buggy?
    - don't know how to reproduce
- farmer job
    - farmer does not store mushrooms at home
    - priority order:
        - if full inventory 
            - if home inventory full => sell
            - else store at home
        - if any full gorwn mushromms
            - harvest mushroom
        - if any not fully planted tiles
            - plant seeds
        - find another tile for farm
    - take tiles:
        - find a tile
        - go near and take it
    - plant mushroom (not seeds required yet)
        - go onto tile and plant
        - planting takes time
    - harvest mushrooms
        - go onto tile and harvest
    - handle full inventory
    - how does citizen get seeds?
        - start easy with just instant create
        - think about inventory management
        - improve with featrure "crafting" :
            - requiremets: like crafting table
            - time to craft
            - end product
            - required materials
            - mushrooms seeds
                - materials required: 1xmushroom
                - end product: 2x seeds
                - time: 1sec
                - requirements: undefined
        - new citizenStateCraft
    - based on citizen vision distance see what fields are ready to harvest
    - make citizen be able to choose job
- check endless loop when every citizen dead?
    - don't know how to reproduce


what next ideas:
- farmer job
    - secure "farmland"
        - take over some map tiles near home rectangle area 
        - check farm field 
            - plant mushrooms 
                - take x-amount of time (12h) to grow, food value increases over time until fully grown
                - 4 mushrooms per tile
                - have some mushroom seed
                    - gained from mushrooms, 1 mushromm > 2 seeds
            - harvest mushrooms 
            - try to sell
            - waiting if nothing to sell
    - when done mushrooms do not instant regrow
- city builder route
    - assign building areas for houses(housing discrict) and markets(comercial district), farmland
- use chatting system for markets
    - be able to better customize chats between customer and cashier
- bad citizens behavior:
    - stealing 
        - might increase stealing habbit
            - might steal more often
            - might steal more than needed
            - if not punished
    - fist fight
        - if someone steals and is found out


--------------------------------------------------
Big Idea:
- do some game for chatters.
    - chatter can play something while i do coding
    - chatter are "just" audiance and can emote somehow
        - think about simple options
        - command "throw ball"
    - chatter are a type of input for a game i build
        - idea: chatSim
            next vision step:
                - citizen have "working job" hours and "free time"
                    - add "free time" and some social or private activities
                    - social activity could be talking with neigbours
                    - some system for random interactions between citizens?
                        - some say "hello neighbour"
                    - make citizen some social meter
                        - no social interaction as extrovert -> want to commit suicide
                            
            citizen trait ideas:
                - different amount of "food need" storage
                - different limit of being hungry or starving
                - different limit of sleep
                - different priorities for needs                        
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
                - society should work with 1 or 10000 inhabitant/chatter
                - should progress through ages/technologies
                - world starts with trees and stones and some type of forest food
                - inhabitants build town own their own
                    - cut down trees for wood -> build wood house with it
                    - gather fruits/meats for food
                    - each inhabitant can have job


