import {describe,it,expect} from 'vitest';
import {resourceFor,validateRecord} from '@/lib/resources';
describe('admin record validation',()=>{
 it('rejects unknown table selection',()=>expect(()=>resourceFor('auth.users')).toThrow());
 it('normalizes email and domains',()=>{expect(validateRecord(resourceFor('emails'),{email:' A@Example.com '})).toEqual({email:'a@example.com'});expect(()=>validateRecord(resourceFor('domains'),{domain:'https://columbia.edu'})).toThrow();});
 it('allows only configured provider adapters and strips unexpected fields',()=>{expect(validateRecord(resourceFor('providers'),{name:'Google',adapter:'google',active:true,secret:'no'})).toEqual({name:'Google',adapter:'google',active:true});expect(()=>validateRecord(resourceFor('providers'),{name:'X',adapter:'https://evil.test',active:true})).toThrow();});
 it('validates glossary content and preserves aliases',()=>{const result=validateRecord(resourceFor('terms'),{term:'Butler',aliases:'Butler Library, Butler Library',definition:'Library',category:'Place',active:true});expect(result.aliases).toEqual(['Butler Library']);expect(()=>validateRecord(resourceFor('terms'),{term:'',active:true})).toThrow();});
});
