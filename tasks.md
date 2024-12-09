Tasks:
- first chat interactions
    - choose "dream job"
        - steps:
            - make property for citizen
            - make property for chatter
            - set when command is typed in chat
            - display in selected data
            - make citizen act on it
        - citizen will try to become it, if it exist
        - dream job is displayed when selected
        - stored at chatter
        - if citizen inizialized in new run, should remember
        - should allow unvalid choices
            - future feature to implement job
            - can only be one
        - command could be: !job <choise>
    - choose trait
        - command could be !trait <choise>
            - early bird or night owl
                - otherwise will be randomised
                - check how changing it of an existing citizen can affect their sleep cycle
            - only one can be choosen
                - overwrites each other
    - how to visualize to chatter what he can do to change his citizen behavior?
        - what jobs do exist?
    - don't just consider commands. Set stuff based on chat messages
        - if ceraint words are seen in chat => set traits/jobs
        - advertisment bots messages -> make citizen want to be food market
            - check in message: "add me on discord"
                -> set dream job "food market"
    

---------------------------------------------------
Tasks done today:
- mushroom pickup behavior
    - citizens do not know where mushrooms are if they are to far away
        - because they can only see a certain distance
    - citizen can see further at day than at night
    - citizen move in random directions hopeing to find a mushroom
    - citizen thinking steps:
        - i gather mushroom
            - i look if i see one in my vision distance
                - if i see one move to
                 - if i am first pick up
            - if i do not see one
                - pick random direction and move to position
                    - remember last direction. to keep walking direction somewhat consistently
                - consider beeing to close to edge/corner of map
- zoom in to mouse cursor not camera middle
- bug: camera move keys not working
- tab to switch between selected visible citizens?
- selecting click should select closest not first
- improved trading code
- trading animation
    - a lot of teleporting of stuff still in. Fix to animate as well

    - on trade move money and item between citizens
        - successfull customer buy trade steps
            - customer put money on counter for marketCitizen
            - and takes item from market inventory
            - marketCitizen takes money from counter into own inventory
        - successfull customer sell trade steps
            - customer put item on counter for marketCitizen
            - marketCitizen puts money on counter
                - and takes item from coutner and puts it into market inventory
            - citizen takes money from counter

        - currently market trade does money + items at the same time. But it should happen separately, so customer can take without paying or leave forgetting to take items after paying
        - currently happes instantly and code relies on it, which makes it hard to put animation between
        - item or money move should have some generall code
        - "setStatePutMoney" from citizen to building (counter) of market.
            - animate
            - marketCitizen takes from counter into his inventory
        - "setStateTradeItem" from citizen to citizen
            - animate


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
                first chat interactions
                - "citizen traits"
                    - something which makes citizen behave differently. Which can be modified by chatters
                        - like trait: "earlybird", wakes up early
                        - trait "nightowl". goes to bed late
                -  chatter can input dream job
                    - dream job will be saved. Citizen will do this job if possible
                    - dream job could be something not yet implemented as a way for me to see what i could implement in the future                    
            second vision step:
                - big map
                - mushrooms and tree do not just instantly respawn
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


