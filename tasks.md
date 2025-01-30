Tasks:
- citizen can ask other citizen for food if starving
    - citizen needs to be part of chunk
        - citizen should check in interval if chunk is still correct
            - check if it matters if done on each tick or just every x seconds
                - matters, but why so much?
            - check if map for chunks is more efficient?
    - put citizen into map objects
    - make search case for citizen
    - create some chat
        - outcome of chat should be a trade of food in good case
        - should not interact with the same citizen twice for same reason
- check "isCitizenInVisionDistance", does not use citize vision. Replace it?
- check if "citizen search" code should be ordered differently, with more files?
- remember markets near home
- check citizen names remember counter beeing to high. Maybe interacting with same citizen twice has incorrect logic?
- check function "citizenCheckTodoList", why condition number?. Change it?
- improve UI?
    - instead of growing list of displayed things
    - make it easier to find citizen
    - display death reasons not only in console.log
    - some statistics?
        - wealth distribution
        - death reason counter

what next ideas:
- bad citizens behavior:
    - stealing 
        - if citizen is starving and has no money, no food, is unhappy
            - citizen will try to steal food from homes
                - just steals the minimum at the start
                - might increase stealing habbit
                    - might steal more often
        - citizen should not always know stuff was stolen. So they need to memorize and when checking inventory realize its missing
    - fist fight
        - if someone steals and is found out
- more images:
    - dog:
        - starving dog => thin dog
        - unhappy dog => mouth down
        - low energy dog => slow dog
        - in combination
- farmer job
    - when done. mushrooms do not instant regrow
- city builder route
    - assign building areas for houses(housing discrict) and markets(comercial district), farmland
- use chatting system for markets
    - be able to better customize chats between customer and cashier


- check: leisure activity put from hekpfull to unhelpful if just failed once? should reduce counter instead?
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


