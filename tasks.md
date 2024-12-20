Tasks:
- social system and "free time"
    - code steps:
        - find wording
            - "tags" to unspecific
            - "happinessTags": string
        - citizens 
            - add property happiness
            - add list for happinessTags which makes citizen more happy
            - add list for unhappinessTags which makes citizen unhappy
        - states
            - add list for happinessTags
        - on each state tick
            - code matches tags of state which tags of citizen and changes happiness based on it
        - sleeping moves happiness to neutral
        - when happiness reaches very low value, citizens dies with message "commited suicide"
        - add new "activities" used for free time/ leisure
            - walking around
            - stay at home
            - add tags
        - if citizen unhappy
            - do an leisure activity

    - citizen have property "happiness"
        - citizen need: "free time"
            - if run low on happiness, they want to do something which makes them happy
        - each citizen has something which makes him happy
            - staying at home
            - walking around outside
            - talking with others
            - creating something
            - doing nothing
        - each citizen has something which makes him unhappy
        - if they do a job which has this activity even job can make them happy
        - happiness can be negativ
            - sleeping makes happiness got to neutral/0
        - commit suicide if it reaches some very low value
        - each state has a set of "tags"
            - each activity knows which tags belongs to it to know when to reduce or increase happiness
        - how does a citizen know what he wants to do in their free time?
            - each citizen has "tags" which makes him happy/unhappy
            - "free time activity" / "leisure activity"
                - activitys have list of tags which they belong to
            - citizen can search available list of activities
    - examples:
        - state "waiting for customer"
            - tags: doing nothing
        - state "gathering mushroom"
            - tags: "walking around" & "outside"
        - 

---------------------------------------------------
Tasks done today:
- check: food market customer want to sell mushrooms but eats his own mushrooms in between which makes trade stuck
    - they adjust based on item amount on counter
- check some more death reasons, maybe something is still off
- check all jobs for breaks. When to check todos. Can lead to citizen death as some job action take a lot of time

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


