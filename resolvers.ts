import { Collection, ObjectId } from "mongodb";
import { APITime, APIPhone, ContactModel } from "./types.ts";
import { GraphQLError } from "graphql";

type Context = {
    ContactCollection: Collection<ContactModel>;
};
type UpdateContactMutationArgs = {
    id:string,
    name?:string,
    phone?:string,
}

export const resolvers = {
    Contact: {
        id: (parent: ContactModel):string => {
            return parent._id!.toString();
        },
        time: async (parent: ContactModel): Promise<string> => {
            const API_KEY = Deno.env.get("API_KEY")
            if(!API_KEY)throw new GraphQLError("You need the api key")
            
            const timezone = parent.timezone;
            const url = `https://api.api-ninjas.com/v1/worldtime?timezone=${timezone}`;
            const data = await fetch(url,
                {
                    headers:{
                        "X-Api-Key":API_KEY
                    }
                }
            );
            if(data.status !==200)throw new GraphQLError("API NINJA ERROR")
            const response: APITime = await data.json();
            return response.datetime;
        },
    },

    Query: {
        getContact: async (_: unknown, args: { id: string }, ctx: Context):Promise<ContactModel|null> => {
            const contact = await ctx.ContactCollection.findOne({ _id: new ObjectId(args.id) });
            return contact;
        },

        getContacts: async (__: unknown, _: unknown, ctx: Context):Promise<ContactModel[]> => {
            return await ctx.ContactCollection.find().toArray();
        },
        
    },
    
    Mutation: {
        deleteContact: async (_: unknown, args: { id: string }, ctx: Context): Promise<boolean> => {
            const {deletedCount} = await ctx.ContactCollection.deleteOne({ _id: new ObjectId(args.id) });
            return deletedCount===1;
        },
        addContact: async (
            _: unknown,
            args: { name: string, phone: string },
            ctx: Context
        ): Promise<ContactModel> => {
            const API_KEY = Deno.env.get("API_KEY")
            if(!API_KEY)throw new GraphQLError("You need the api key")

            const {phone, name} = args;
            const phoneExist = await ctx.ContactCollection.countDocuments({phone});
            if(phoneExist>=1)throw new GraphQLError("Phone already exists")
            

            const url = `https://api.api-ninjas.com/v1/validatephone?number=${phone}`;

            const data = await fetch(url,
                {
                    headers:{
                        "X-Api-Key":API_KEY
                    }
                }
            );
            if(data.status!==200)throw new GraphQLError("API Ninja Error")
            
            const response:APIPhone = await data.json();
            if(response.is_valid)throw new GraphQLError("Not valid")
            const country = response.country;
            const timezone = response.timezones[0];

            const {insertedId} = await ctx.ContactCollection.insertOne({
                name,
                phone,
                country,
                timezone
            })
            return {
                _id:insertedId,
                name,
                phone,
                country,
                timezone,
            }
        },
        

        updateContact: async (
            _: unknown,
            args: UpdateContactMutationArgs,
            ctx: Context
        ): Promise<ContactModel> => {
            const API_KEY = Deno.env.get("API_KEY")
            if(!API_KEY)throw new GraphQLError("You need the api key")

            const {id, phone, name} = args;
            if(!phone&&!name){
                throw new GraphQLError("You must at least update one value");
            }
            if(!phone){
                const newUser = await ctx.ContactCollection.findOneAndUpdate({
                    _id:new ObjectId(id)
                },{
                    $set:{name}
                });
                if(!newUser)throw new GraphQLError("User not found")
                return newUser;
            }
            const phoneExists = await ctx.ContactCollection.findOne({phone});
            if(phoneExists&&phoneExists._id!.toString()!==id)throw new GraphQLError("Phone already taken")
            
            if(phoneExists){
                const newUser = await ctx.ContactCollection.findOneAndUpdate({
                    _id:new ObjectId(id)
                },{
                    $set:{name: name || phoneExists.name}
                });
                if(!newUser)throw new GraphQLError("User not found")
                return newUser;
            }
            const url = `https://api.api-ninjas.com/v1/validatephone?number=${phone}`;

            const data = await fetch(url,
                {
                    headers:{
                        "X-Api-Key":API_KEY
                    }
                }
            );
            if(data.status!==200)throw new GraphQLError("API Ninja Error")
            
            const response:APIPhone = await data.json();
            if(response.is_valid)throw new GraphQLError("Not valid")
            const country = response.country;
            const timezone = response.timezones[0];

            const newUser = await ctx.ContactCollection.findOneAndUpdate({
                _id:new ObjectId(id)},{
                name,
                phone,
                country,
                timezone
            })
            return newUser;
        },
    },
};
