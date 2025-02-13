Tasks:
- check: 3 part chat command cut off? longer traits dont work?
- feature: fatness
    - code steps:
        - add property fatness to citizen
            - min 0
            - default 1
            - max ?
        - when foodlevel in starving area, use up fatness for less foodlevel decrease
        - when foodlevel full and fatness low, decrease foodlevel faster to regain fatness
        - change eating to work above maximum
            - when eating and full get fater
        - add leisure eating
        - add happiness tags: eating
            - add different scalings for negative and positive (as eating is required, it should not be to negative) 
        - change bodyPaint
            - fix tail distance
        - when fatness high and physically active reduce fatness by tiny amount
        - change move speed based on fatness

    - if citizen is full and eats he gets fat
    - if citizen is starving his fat will be used up to slow down how fast he starves
    - moving slower with high fatness
    - happines tag "eating"
        - citizen will get happy if eats
    - leisure: eating
        - gets fat if already full
    - fatness reduces to normal amount when "physically active"
    - when fatness low and foodLevel hight, citizen will become hungry faster for regenerating fatness to normal amount
    - citizenBodyPaint: change body based on fatness
- check endless loop when every citizen dead?
    - don't know how to reproduce

what next ideas:
- change starving
    - citizen get fatness stat
- farmer job
    - when done. mushrooms do not instant regrow
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


